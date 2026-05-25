#!/usr/bin/ucode
'use strict';

import * as uloop from "uloop";
import * as libubus from "ubus";

const MSTPCTL = "/sbin/mstpctl";

let ubus;
let bridge_cfg = {};
let enable_pending = {};

const ENABLE_RETRY_DELAY_MS = 1000;
const ENABLE_RETRY_MAX = 30;

function log(msg)
{
	system(["logger", "-t", "mstpd-ubus", msg]);
}

function run_mstpctl(...args)
{
	return system([MSTPCTL, ...args]);
}

function bridge_exists(name)
{
	return system(["/sbin/ip", "link", "show", "dev", name]) == 0;
}

// TODO: It seems that netifd reports invalid numbers. So ignore it for now.
function cache_bridge_config(data)
{
	if (!data?.name)
		return false;

	let cfg = bridge_cfg[data.name] ?? {};

	if (data.proto != null)
		cfg.proto = lc(data.proto);
	if (data.forward_delay != null)
		cfg.forward_delay = int(data.forward_delay);
	if (data.hello_time != null)
		cfg.hello_time = int(data.hello_time);
	if (data.max_age != null)
		cfg.max_age = int(data.max_age);
	if (data.ageing_time != null)
		cfg.ageing_time = int(data.ageing_time);

	bridge_cfg[data.name] = cfg;
	return true;
}

function try_enable_bridge(name)
{
	if (!bridge_exists(name))
		return -1;
	return run_mstpctl("addbridge", name);
}

function schedule_enable_bridge(name, retries)
{
	if (!name)
		return;

	let state = enable_pending[name];
	if (state?.active)
		return;

	enable_pending[name] = {
		active: true,
		retries: retries ?? ENABLE_RETRY_MAX,
	};

	function attempt() {
		let cur = enable_pending[name];
		if (!cur?.active)
			return;

		let rc = try_enable_bridge(name);
		if (rc == 0) {
			log(`bridge ${name} enabled under mstpd`);
			delete enable_pending[name];
			return;
		}

		cur.retries--;
		if (cur.retries <= 0) {
			log(`addbridge failed for ${name}: rc=${rc}, giving up`);
			delete enable_pending[name];
			return;
		}

		uloop.timer(ENABLE_RETRY_DELAY_MS, attempt);
	}

	uloop.timer(0, attempt);
}

function ubus_add_bridge(req)
{
	if (!cache_bridge_config(req.args))
		return libubus.STATUS_INVALID_ARGUMENT;

	return 0;
}

function ubus_bridge_state(req)
{
	let data = req.args ?? {};
	let name = data.name;
	let enabled = data.enabled;

	if (!name || enabled == null)
		return libubus.STATUS_INVALID_ARGUMENT;

	if (!bridge_exists(name))
		return libubus.STATUS_NOT_FOUND;

	if (enabled) {
		if (!(name in bridge_cfg))
			return libubus.STATUS_NOT_FOUND;

		let rc = try_enable_bridge(name);
		if (rc != 0) {
			schedule_enable_bridge(name, ENABLE_RETRY_MAX);
			return libubus.STATUS_UNKNOWN_ERROR;
		}
		return 0;
	}

	run_mstpctl("delbridge", name);

	return 0;
}

let ustp_obj = {
	add_bridge: {
		args: {
			name: "",
			proto: "",
			forward_delay: 0,
			hello_time: 0,
			max_age: 0,
			ageing_time: 0,
		},
		call: ubus_add_bridge,
	},
	bridge_state: {
		args: {
			name: "",
			enabled: true,
		},
		call: ubus_bridge_state,
	},
};

function ex_handler(e)
{
	log(`exception: ${e}`);
	return libubus.STATUS_UNKNOWN_ERROR;
}

uloop.init();
libubus.guard(ex_handler);
ubus = libubus.connect();

if (!ubus) {
	log("failed to connect to ubus");
	exit(1);
}

let sub = ubus.subscriber((msg) => {
	if (msg?.type != "stp_init")
		return;
	let name = msg.data?.name;
	log(`stp_init notification for ${name}`);
	cache_bridge_config(msg.data);
	/* Defer enable_bridge so netifd's own stp_state toggle (false->true)
	 * completes before mstpd bridge takeover. */
	if (name)
		uloop.timer(500, () => schedule_enable_bridge(name, ENABLE_RETRY_MAX));
});

function netifd_subscribe()
{
	try {
		if (sub && ubus.list("network.device")) {
			sub.subscribe("network.device");
			/* Like upstream ustp: trigger netifd to send stp_init for all
			 * currently active bridges so we can cache their config and
			 * take over management. Deferred to ensure uloop is running. */
			uloop.timer(100, () => {
				try { ubus.call("network.device", "stp_init", {}); } catch(e) {}
			});
		}
	} catch (e) {
		// network.device may not exist yet; listener will retry on object add.
	}
}

let listener = ubus.listener("ubus.object.add", (event, msg) => {
	if (msg?.path == "network.device")
		netifd_subscribe();
});

let ustp = ubus.publish("ustp", ustp_obj);

log("ustp ubus wrapper started");
netifd_subscribe();

uloop.run();
log("ustp ubus wrapper exiting");
