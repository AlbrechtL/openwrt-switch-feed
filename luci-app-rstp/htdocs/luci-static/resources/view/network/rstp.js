'use strict';
'require view';
'require dom';
'require poll';
'require rpc';
'require ui';
'require uci';

const callOverview = rpc.declare({
	object: 'luci.rstp',
	method: 'get_overview',
	expect: {}
});

const callApplyBridge = rpc.declare({
	object: 'luci.rstp',
	method: 'apply_bridge',
	params: [ 'name', 'config', 'ports' ],
	expect: {}
});

function sanitizeId(value) {
	return String(value).replace(/[^A-Za-z0-9_-]/g, '_');
}

function bridgeHash(name) {
	return encodeURIComponent(name);
}

function asBool(value, def) {
	if (value == null)
		return def;

	return value === true || value === 1 || value === '1';
}

function asString(value, def) {
	return (value == null) ? String(def) : String(value);
}

function renderText(value) {
	return value == null || value === '' ? '-' : String(value);
}

function normalizeOverview(data) {
	if (!data || typeof data !== 'object')
		return null;

	if (!Array.isArray(data.bridges))
		return null;

	if (!data.apply_support || typeof data.apply_support !== 'object')
		data.apply_support = {};

	return data;
}

return view.extend({
	pollRegistered: false,
	overview: null,
	overviewLoadError: false,
	hasBridgeInView: false,

	loadOverview: function() {
		return callOverview()
			.then((data) => {
				data = normalizeOverview(data);
				if (!data)
					throw new Error('Invalid overview payload');

				this.overviewLoadError = false;
				return data;
			})
			.catch(() => {
				return L.resolveDefault(callOverview(), null)
					.then((data) => {
						data = normalizeOverview(data);
						this.overviewLoadError = (data == null);
						return data || { bridges: [], apply_support: {} };
					});
			});
	},

	load: function() {
		return Promise.all([
			uci.load('rstp'),
			this.loadOverview()
		]);
	},

	getSelectedBridgeName: function(overview) {
		const bridges = overview?.bridges || [];
		const hash = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));

		if (bridges.some((bridge) => bridge.name === hash))
			return hash;

		return bridges.length ? bridges[0].name : null;
	},

	getSelectedBridge: function(overview) {
		const selected = this.getSelectedBridgeName(overview);
		return (overview?.bridges || []).find((bridge) => bridge.name === selected) || null;
	},

	renderField: function(title, fieldNode, description) {
		return E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title', 'data-tooltip': description || null }, title),
			E('div', { 'class': 'cbi-value-field' }, [ fieldNode ])
		]);
	},

	renderBridgeInfoSection: function(bridge) {
		if (!bridge?.bridge_info)
			return '';

		const info = bridge.bridge_info;
		const deviceStatus = info.is_root ? _('Root') : _('Non-Root');

		return E('div', { 'class': 'cbi-section' }, [
			E('h3', _('Root bridge information')),
			E('table', { 'class': 'table' }, [
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'style': 'font-weight: bold;' }, _('Device Status')),
					E('td', { 'class': 'td', 'id': 'rstp-bridge-device-status' }, deviceStatus)
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'style': 'font-weight: bold;' }, _('Root Bridge ID')),
					E('td', { 'class': 'td', 'id': 'rstp-bridge-designated-root' }, renderText(info.designated_root))
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'style': 'font-weight: bold;' }, _('Root Priority')),
					E('td', { 'class': 'td', 'id': 'rstp-bridge-root-priority' }, renderText(info.root_priority))
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'style': 'font-weight: bold;' }, _('Root Port')),
					E('td', { 'class': 'td', 'id': 'rstp-bridge-root-port' }, renderText(info.root_port))
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'style': 'font-weight: bold;' }, _('Path Cost')),
					E('td', { 'class': 'td', 'id': 'rstp-bridge-path-cost' }, renderText(info.path_cost))
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'style': 'font-weight: bold;' }, _('Max Age Time')),
					E('td', { 'class': 'td', 'id': 'rstp-bridge-max-age' }, renderText(info.bridge_max_age))
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'style': 'font-weight: bold;' }, _('Hello Time')),
					E('td', { 'class': 'td', 'id': 'rstp-bridge-hello-time' }, renderText(info.hello_time))
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'style': 'font-weight: bold;' }, _('Forward Delay Time')),
					E('td', { 'class': 'td', 'id': 'rstp-bridge-forward-delay' }, renderText(info.bridge_forward_delay))
				])
			])
		]);
	},

	renderBridgeSelector: function(overview, selectedName) {
		if ((overview?.bridges || []).length <= 1)
			return '';

		const selector = E('select', {
			'class': 'cbi-input-select',
			'id': 'rstp-bridge-selector'
		});

		overview.bridges.forEach((bridge) => {
			selector.appendChild(E('option', {
				'value': bridge.name,
				'selected': bridge.name === selectedName
			}, bridge.name));
		});

		selector.addEventListener('change', function(ev) {
			window.location.hash = bridgeHash(ev.target.value);
			window.location.reload();
		});

		return E('div', { 'class': 'cbi-section' }, [
			E('h3', _('Bridge selection')),
			this.renderField(_('Bridge'), selector,
				_('Choose the bridge instance whose spanning tree settings and ports should be shown.'))
		]);
	},

	renderGeneralSection: function(bridge, applySupport) {
		const config = bridge.config;
		const unsupported = [];

		if (!applySupport.priority)
			unsupported.push(_('Bridge priority'));

		if (!applySupport.hold_count)
			unsupported.push(_('Hold count'));

		if (!applySupport.max_hops)
			unsupported.push(_('Max hops'));

		return E('div', { 'class': 'cbi-section' }, [
			E('h3', _('Spanning tree settings')),
			this.renderField(_('Enable spanning tree'), E('input', {
				'id': 'rstp-enabled',
				'class': 'cbi-input-checkbox',
				'type': 'checkbox',
				'checked': !!config.enabled
			}), _('Enable or disable spanning tree handling for the selected bridge.')),
			this.renderField(_('Mode'), E('select', {
				'id': 'rstp-mode',
				'class': 'cbi-input-select'
			}, [
				E('option', { 'value': 'stp', 'selected': config.mode === 'stp' }, 'STP'),
				E('option', { 'value': 'rstp', 'selected': config.mode === 'rstp' }, 'RSTP'),
				E('option', { 'value': 'mstp', 'selected': config.mode === 'mstp' }, 'MSTP')
			]), _('Select the protocol version to advertise for this bridge.')),
			this.renderField(_('Priority'), E('input', {
				'id': 'rstp-priority',
				'class': 'cbi-input-text',
				'type': 'number',
				'min': '0',
				'max': '61440',
				'step': '4096',
				'value': asString(config.priority, 32768)
			}), _('Lower values are preferred when electing the root bridge.')),
			this.renderField(_('Max age'), E('input', {
				'id': 'rstp-max-age',
				'class': 'cbi-input-text',
				'type': 'number',
				'min': '6',
				'max': '40',
				'value': asString(config.max_age, 20)
			}), _('Bridge Max Age must be between 6 and 40 seconds.')),
			this.renderField(_('Forward delay'), E('input', {
				'id': 'rstp-forward-delay',
				'class': 'cbi-input-text',
				'type': 'number',
				'min': '4',
				'max': '30',
				'value': asString(config.forward_delay, 15)
			}), _('Bridge Forward Delay must be between 4 and 30 seconds.')),
			this.renderField(_('Hello time'), E('input', {
				'id': 'rstp-hello-time',
				'class': 'cbi-input-text',
				'type': 'number',
				'min': '1',
				'max': '10',
				'value': asString(config.hello_time, 2)
			}), _('Bridge Hello Time must be between 1 and 10 seconds.')),
			this.renderField(_('Hold count'), E('input', {
				'id': 'rstp-hold-count',
				'class': 'cbi-input-text',
				'type': 'number',
				'min': '1',
				'max': '10',
				'value': asString(config.hold_count, 6)
			}), _('Transmit Hold Count must be between 1 and 10.')),
			this.renderField(_('Max hops'), E('input', {
				'id': 'rstp-max-hops',
				'class': 'cbi-input-text',
				'type': 'number',
				'min': '6',
				'max': '40',
				'value': asString(config.max_hops, 20)
			}), _('Bridge Max Hops must be between 6 and 40.')),
			unsupported.length ? E('div', { 'class': 'alert-message notice' }, [
				_('%s are stored in UCI but are not pushed into runtime yet because the current ustp ubus API does not expose setters for them.').format(unsupported.join(', '))
			]) : ''
		]);
	},

	renderPortRow: function(port) {
		const portId = sanitizeId(port.name);

		return E('tr', { 'class': 'tr cbi-section-table-row' }, [
			E('td', { 'class': 'td' }, port.name),
			E('td', { 'class': 'td', 'id': `rstp-${portId}-protocol` }, renderText(port.protocol)),
			E('td', { 'class': 'td', 'id': `rstp-${portId}-state` }, renderText(port.state)),
			E('td', { 'class': 'td', 'id': `rstp-${portId}-role` }, renderText(port.role)),
			E('td', { 'class': 'td', 'id': `rstp-${portId}-cost` }, renderText(port.path_cost)),
			E('td', { 'class': 'td', 'id': `rstp-${portId}-priority` }, renderText(port.port_priority)),
			E('td', { 'class': 'td', 'id': `rstp-${portId}-oper-edge-status` }, asBool(port.oper_edge_port, false) ? _('Yes') : _('No')),
			E('td', { 'class': 'td', 'id': `rstp-${portId}-oper-p2p-status` }, asBool(port.oper_p2p, false) ? _('Yes') : _('No')),
			E('td', { 'class': 'td' }, [
				E('label', { 'class': 'cbi-checkbox' }, [
					E('input', {
						'id': `rstp-${portId}-admin-edge`,
						'type': 'checkbox',
						'class': 'cbi-input-checkbox',
						'checked': !!port.admin_edge_port
					}),
					' ', _('Admin edge')
				]),
				E('div', { 'class': 'cbi-value-description' }, [
					_('Auto') + ': ',
					E('span', { 'id': `rstp-${portId}-auto-edge` }, asBool(port.auto_edge_port, true) ? _('Yes') : _('No')),
					' | ',
					_('Oper') + ': ',
					E('span', { 'id': `rstp-${portId}-oper-edge` }, asBool(port.oper_edge_port, false) ? _('Yes') : _('No'))
				])
			])
		]);
	},

	renderPortsSection: function(bridge) {
		return E('div', { 'class': 'cbi-section cbi-tblsection' }, [
			E('h3', _('Port status and edge settings')),
			E('div', { 'class': 'cbi-value-description' },
				_('The table below polls runtime port status. The edge port checkbox writes the administrative edge flag, while the Auto and Oper values are runtime status indicators.')),
			E('table', { 'class': 'table cbi-section-table' }, [
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, _('Port name')),
					E('th', { 'class': 'th' }, _('Protocol')),
					E('th', { 'class': 'th' }, _('State')),
					E('th', { 'class': 'th' }, _('Role')),
					E('th', { 'class': 'th' }, _('Port cost')),
					E('th', { 'class': 'th' }, _('Port priority')),
					E('th', { 'class': 'th' }, _('Oper edge')),
					E('th', { 'class': 'th' }, _('Oper p2p')),
					E('th', { 'class': 'th' }, _('Edge port'))
				]),
				E('tbody', { 'id': 'rstp-port-status-body' }, bridge.ports.map(this.renderPortRow.bind(this)))
			])
		]);
	},

	renderTopologyChangesSection: function(bridge) {
		if (!bridge?.bridge_info)
			return '';

		const info = bridge.bridge_info;

		return E('div', { 'class': 'cbi-section' }, [
			E('h3', _('Topology changes')),
			E('table', { 'class': 'table' }, [
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'style': 'font-weight: bold;' }, _('Topology Change Count')),
					E('td', { 'class': 'td', 'id': 'rstp-topology-change-count' }, renderText(info.topology_change_count))
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'style': 'font-weight: bold;' }, _('Last Topology Change Port')),
					E('td', { 'class': 'td', 'id': 'rstp-topology-last-port' }, renderText(info.last_topology_change_port))
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'style': 'font-weight: bold;' }, _('Time Since Last Change')),
					E('td', { 'class': 'td', 'id': 'rstp-topology-time-since' }, renderText(info.time_since_topology_change) + ' ' + _('seconds'))
				])
			])
		]);
	},

	renderNoBridgeState: function() {
		return E('div', { 'class': 'cbi-section' }, [
			E('h3', _('Spanning Tree')),
			E('p', { 'class': 'cbi-value-description' },
				_('No bridge devices were found. Create at least one Linux bridge device before using this page.'))
		]);
	},

	renderOverviewLoadError: function() {
		return E('div', { 'class': 'cbi-section' }, [
			E('h3', _('Spanning Tree')),
			E('div', { 'class': 'alert-message warning' }, [
				_('Failed to load bridge status from the backend. Please reload this page. If the issue persists, verify rpcd and the luci.rstp ubus object on the device.')
			])
		]);
	},

	validatePayload: function(payload) {
		const config = payload.config;
		const mode = config.mode;
		const priority = +config.priority;
		const maxAge = +config.max_age;
		const forwardDelay = +config.forward_delay;
		const helloTime = +config.hello_time;
		const holdCount = +config.hold_count;
		const maxHops = +config.max_hops;

		if (![ 'stp', 'rstp', 'mstp' ].includes(mode))
			return _('Mode must be one of STP, RSTP, or MSTP.');

		if (!Number.isInteger(priority) || priority < 0 || priority > 61440 || (priority % 4096) !== 0)
			return _('Priority must be a multiple of 4096 in the range 0 to 61440.');

		if (!Number.isInteger(maxAge) || maxAge < 6 || maxAge > 40)
			return _('Max age must be an integer between 6 and 40.');

		if (!Number.isInteger(forwardDelay) || forwardDelay < 4 || forwardDelay > 30)
			return _('Forward delay must be an integer between 4 and 30.');

		if (!Number.isInteger(helloTime) || helloTime < 1 || helloTime > 10)
			return _('Hello time must be an integer between 1 and 10.');

		if (!Number.isInteger(holdCount) || holdCount < 1 || holdCount > 10)
			return _('Hold count must be an integer between 1 and 10.');

		if (!Number.isInteger(maxHops) || maxHops < 6 || maxHops > 40)
			return _('Max hops must be an integer between 6 and 40.');

		if ((2 * (forwardDelay - 1)) < maxAge)
			return _('Configured bridge times must satisfy 2 * (Forward Delay - 1) >= Max Age.');

		return null;
	},

	buildPayload: function() {
		const bridge = this.getSelectedBridge(this.overview);

		if (!bridge)
			return null;

		const payload = {
			name: bridge.name,
			config: {
				enabled: document.getElementById('rstp-enabled').checked,
				mode: document.getElementById('rstp-mode').value,
				priority: document.getElementById('rstp-priority').value,
				max_age: document.getElementById('rstp-max-age').value,
				forward_delay: document.getElementById('rstp-forward-delay').value,
				hello_time: document.getElementById('rstp-hello-time').value,
				hold_count: document.getElementById('rstp-hold-count').value,
				max_hops: document.getElementById('rstp-max-hops').value,
				ageing_time: bridge.config.ageing_time || 300
			},
			ports: bridge.ports.map((port) => ({
				name: port.name,
				admin_edge_port: document.getElementById(`rstp-${sanitizeId(port.name)}-admin-edge`).checked,
				auto_edge_port: asBool(port.auto_edge_port, true)
			}))
		};

		return payload;
	},

	syncUci: function(payload) {
		const bridgeSections = uci.sections('rstp', 'bridge') || [];
		const portSections = uci.sections('rstp', 'port') || [];
		let bridgeSection = bridgeSections.find((section) => section.name === payload.name);

		if (!bridgeSection) {
			bridgeSection = { '.name': uci.add('rstp', 'bridge') };
		}

		uci.set('rstp', bridgeSection['.name'], 'name', payload.name);
		uci.set('rstp', bridgeSection['.name'], 'enabled', payload.config.enabled ? '1' : '0');
		uci.set('rstp', bridgeSection['.name'], 'mode', payload.config.mode);
		uci.set('rstp', bridgeSection['.name'], 'priority', payload.config.priority);
		uci.set('rstp', bridgeSection['.name'], 'max_age', payload.config.max_age);
		uci.set('rstp', bridgeSection['.name'], 'forward_delay', payload.config.forward_delay);
		uci.set('rstp', bridgeSection['.name'], 'hello_time', payload.config.hello_time);
		uci.set('rstp', bridgeSection['.name'], 'hold_count', payload.config.hold_count);
		uci.set('rstp', bridgeSection['.name'], 'max_hops', payload.config.max_hops);
		uci.set('rstp', bridgeSection['.name'], 'ageing_time', String(payload.config.ageing_time));

		const wantedPorts = new Set(payload.ports.map((port) => port.name));

		portSections
			.filter((section) => section.bridge === payload.name && !wantedPorts.has(section.port))
			.forEach((section) => uci.remove('rstp', section['.name']));

		payload.ports.forEach((port) => {
			let portSection = portSections.find((section) => section.bridge === payload.name && section.port === port.name);

			if (!portSection) {
				portSection = { '.name': uci.add('rstp', 'port') };
			}

			uci.set('rstp', portSection['.name'], 'bridge', payload.name);
			uci.set('rstp', portSection['.name'], 'port', port.name);
			uci.set('rstp', portSection['.name'], 'admin_edge_port', port.admin_edge_port ? '1' : '0');
			uci.set('rstp', portSection['.name'], 'auto_edge_port', port.auto_edge_port ? '1' : '0');
		});

		return uci.save();
	},

	refreshRuntime: function() {
		return L.resolveDefault(callOverview(), null).then(L.bind(function(overview) {
			overview = normalizeOverview(overview);

			if (!overview)
				return;

			this.overview = overview;

			const bridge = this.getSelectedBridge(overview);
			if (!!bridge !== !!this.hasBridgeInView) {
				window.location.reload();
				return;
			}

			if (!bridge)
				return;

			// Update bridge info section
			if (bridge.bridge_info) {
				const deviceStatus = document.getElementById('rstp-bridge-device-status');
				const designatedRoot = document.getElementById('rstp-bridge-designated-root');
				const rootPriority = document.getElementById('rstp-bridge-root-priority');
				const rootPort = document.getElementById('rstp-bridge-root-port');
				const pathCost = document.getElementById('rstp-bridge-path-cost');
				const maxAge = document.getElementById('rstp-bridge-max-age');
				const helloTime = document.getElementById('rstp-bridge-hello-time');
				const forwardDelay = document.getElementById('rstp-bridge-forward-delay');

				if (deviceStatus)
					dom.content(deviceStatus, bridge.bridge_info.is_root ? _('Root') : _('Non-Root'));
				if (designatedRoot)
					dom.content(designatedRoot, renderText(bridge.bridge_info.designated_root));
				if (rootPriority)
					dom.content(rootPriority, renderText(bridge.bridge_info.root_priority));
				if (rootPort)
					dom.content(rootPort, renderText(bridge.bridge_info.root_port));
				if (pathCost)
					dom.content(pathCost, renderText(bridge.bridge_info.path_cost));
				if (maxAge)
					dom.content(maxAge, renderText(bridge.bridge_info.bridge_max_age));
				if (helloTime)
					dom.content(helloTime, renderText(bridge.bridge_info.hello_time));
				if (forwardDelay)
					dom.content(forwardDelay, renderText(bridge.bridge_info.bridge_forward_delay));
			}

			// Update topology changes section
			if (bridge.bridge_info) {
				const changeCount = document.getElementById('rstp-topology-change-count');
				const lastPort = document.getElementById('rstp-topology-last-port');
				const timeSince = document.getElementById('rstp-topology-time-since');

				if (changeCount)
					dom.content(changeCount, renderText(bridge.bridge_info.topology_change_count));
				if (lastPort)
					dom.content(lastPort, renderText(bridge.bridge_info.last_topology_change_port));
				if (timeSince)
					dom.content(timeSince, renderText(bridge.bridge_info.time_since_topology_change) + ' ' + _('seconds'));
			}

			// Update port rows
			bridge.ports.forEach((port) => {
				const portId = sanitizeId(port.name);
				const protocol = document.getElementById(`rstp-${portId}-protocol`);
				const state = document.getElementById(`rstp-${portId}-state`);
				const role = document.getElementById(`rstp-${portId}-role`);
				const cost = document.getElementById(`rstp-${portId}-cost`);
				const priority = document.getElementById(`rstp-${portId}-priority`);
				const operEdgeStatus = document.getElementById(`rstp-${portId}-oper-edge-status`);
				const operP2pStatus = document.getElementById(`rstp-${portId}-oper-p2p-status`);
				const autoEdge = document.getElementById(`rstp-${portId}-auto-edge`);
				const operEdge = document.getElementById(`rstp-${portId}-oper-edge`);

				if (protocol)
					dom.content(protocol, renderText(port.protocol));

				if (state)
					dom.content(state, renderText(port.state));

				if (role)
					dom.content(role, renderText(port.role));

				if (cost)
					dom.content(cost, renderText(port.path_cost));

				if (priority)
					dom.content(priority, renderText(port.port_priority));

				if (operEdgeStatus)
					dom.content(operEdgeStatus, asBool(port.oper_edge_port, false) ? _('Yes') : _('No'));

				if (operP2pStatus)
					dom.content(operP2pStatus, asBool(port.oper_p2p, false) ? _('Yes') : _('No'));

				if (autoEdge)
					dom.content(autoEdge, asBool(port.auto_edge_port, true) ? _('Yes') : _('No'));

				if (operEdge)
					dom.content(operEdge, asBool(port.oper_edge_port, false) ? _('Yes') : _('No'));
			});
		}, this));
	},

	handleSave: function() {
		const payload = this.buildPayload();

		if (!payload)
			return Promise.resolve();

		const validationError = this.validatePayload(payload);
		if (validationError) {
			ui.addNotification(null, E('p', validationError));
			return Promise.reject(new Error(validationError));
		}

		return this.syncUci(payload);
	},

	handleSaveApply: function(ev, mode) {
		const payload = this.buildPayload();

		if (!payload)
			return Promise.resolve();

		const validationError = this.validatePayload(payload);
		if (validationError) {
			ui.addNotification(null, E('p', validationError));
			return Promise.reject(new Error(validationError));
		}

		return this.syncUci(payload)
			.then(() => L.resolveDefault(callApplyBridge(payload.name, payload.config, payload.ports), {}))
			.then((result) => {
				if (result?.error)
					ui.addNotification(null, E('p', result.error));

				if (Array.isArray(result?.warnings) && result.warnings.length)
					ui.addNotification(null, E('p', result.warnings.join(' ')));

				return ui.changes.apply(mode == '0');
			});
	},

	handleReset: function() {
		window.location.reload();
	},

	render: function(data) {
		this.overview = data[1];

		const bridge = this.getSelectedBridge(this.overview);
		this.hasBridgeInView = !!bridge;
		const selectedName = this.getSelectedBridgeName(this.overview);
		const mainSection = this.overviewLoadError
			? this.renderOverviewLoadError()
			: (bridge ? this.renderGeneralSection(bridge, this.overview.apply_support || {}) : this.renderNoBridgeState());
		const bridgeInfoSection = (!this.overviewLoadError && bridge) ? this.renderBridgeInfoSection(bridge) : '';
		const portsSection = (!this.overviewLoadError && bridge) ? this.renderPortsSection(bridge) : '';
		const topologySection = (!this.overviewLoadError && bridge) ? this.renderTopologyChangesSection(bridge) : '';
		const content = E('div', {}, [
			this.renderBridgeSelector(this.overview, selectedName),
			bridgeInfoSection,
			mainSection,
			portsSection,
			topologySection
		]);

		if (!this.pollRegistered) {
			poll.add(L.bind(function() {
				return this.refreshRuntime();
			}, this), 5);
			this.pollRegistered = true;
		}

		return content;
	}
});
