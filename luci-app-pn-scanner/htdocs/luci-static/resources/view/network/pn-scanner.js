'use strict';
'require view';
'require fs';
'require ui';
'require network';

const PN_SCANNER_BIN = '/usr/bin/pn_scanner';

return view.extend({
	outputText: '',

	handleCommand(args) {
		const runButton = document.getElementById('pn-scanner-run');
		const clearButton = document.getElementById('pn-scanner-clear');
		const out = document.getElementById('pn-scanner-output');

		if (runButton)
			runButton.setAttribute('disabled', 'true');
		if (clearButton)
			clearButton.setAttribute('disabled', 'true');

		return fs.exec_direct(PN_SCANNER_BIN, args, 'text', false, true, (ev) => {
			this.outputText = ev.target.response;
			if (out) {
				out.textContent = this.outputText;
				out.scrollTop = out.scrollHeight;
			}
		}).then((res) => {
			this.outputText = res || '';
			if (out) {
				out.textContent = this.outputText;
				out.scrollTop = out.scrollHeight;
			}
		}).catch((err) => {
			ui.addNotification(null, E('p', [ err ]));
		}).finally(() => {
			if (runButton)
				runButton.removeAttribute('disabled');
			if (clearButton)
				clearButton.removeAttribute('disabled');
		});
	},

	handleRun() {
		const iface = document.getElementById('pn-scanner-iface')?.value || '';
		const mode = document.getElementById('pn-scanner-mode')?.value || 'local';
		const target = document.getElementById('pn-scanner-target')?.value?.trim() || '';
		const duration = document.getElementById('pn-scanner-duration')?.value?.trim() || '';
		const args = [];

		if (!iface) {
			ui.addNotification(null, E('p', _('Please select an interface.')));
			return;
		}

		args.push('--interface', iface);
		args.push('--mode', mode);

		if (mode === 'remote') {
			if (!target) {
				ui.addNotification(null, E('p', _('Target is required for remote mode.')));
				return;
			}

			args.push('--target', target);
		}

		if (duration) {
			if (!/^[1-9][0-9]*$/.test(duration)) {
				ui.addNotification(null, E('p', _('Duration must be a positive integer.')));
				return;
			}

			args.push('--duration', duration);
		}

		this.outputText = _('Running: %s %s\n\n').format(PN_SCANNER_BIN, args.join(' '));
		const out = document.getElementById('pn-scanner-output');
		if (out)
			out.textContent = this.outputText;

		return this.handleCommand(args);
	},

	handleClear() {
		this.outputText = '';
		const out = document.getElementById('pn-scanner-output');
		if (out)
			out.textContent = '';
	},

	handleModeChange() {
		const mode = document.getElementById('pn-scanner-mode')?.value || 'local';
		const targetWrap = document.getElementById('pn-scanner-target-wrap');
		if (targetWrap)
			targetWrap.style.display = (mode === 'remote') ? '' : 'none';
	},

	load() {
		return Promise.all([
			L.resolveDefault(fs.stat(PN_SCANNER_BIN), null),
			network.getDevices()
		]);
	},

	render([binStat, devices]) {
		if (!binStat) {
			return E('div', { 'class': 'cbi-map' }, [
				E('h2', {}, [ _('PN Scanner') ]),
				E('div', { 'class': 'cbi-map-descr' }, [
					_('pn_scanner is not installed. Please install package pn-scanner first.')
				])
			]);
		}

		const ifaceOptions = devices
			.filter((dev) => dev && dev.getName && dev.getName() !== 'lo')
			.map((dev) => E('option', { 'value': dev.getName() }, [ dev.getI18n ? dev.getI18n() : dev.getName() ]));

		const view = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, [ _('PN Scanner') ]),
			E('div', { 'class': 'cbi-map-descr' }, [
				_('Run PROFINET scans in local, remote, or topology mode using pn_scanner.')
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'pn-scanner-iface' }, [ _('Interface') ]),
					E('div', { 'class': 'cbi-value-field' }, [
						E('select', { 'id': 'pn-scanner-iface', 'style': 'max-width: 28em;' }, ifaceOptions)
					])
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'pn-scanner-mode' }, [ _('Mode') ]),
					E('div', { 'class': 'cbi-value-field' }, [
						E('select', {
							'id': 'pn-scanner-mode',
							'style': 'max-width: 28em;',
							'change': ui.createHandlerFn(this, 'handleModeChange')
						}, [
							E('option', { 'value': 'local' }, [ _('Local (DCP)') ]),
							E('option', { 'value': 'remote' }, [ _('Remote (RPC)') ]),
							E('option', { 'value': 'topology' }, [ _('Topology') ])
						])
					])
				]),
				E('div', { 'class': 'cbi-value', 'id': 'pn-scanner-target-wrap', 'style': 'display:none' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'pn-scanner-target' }, [ _('Target') ]),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', {
							'id': 'pn-scanner-target',
							'type': 'text',
							'placeholder': '192.168.1.10 or 192.168.1.10-20',
							'style': 'max-width: 28em;'
						})
					])
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'pn-scanner-duration' }, [ _('Duration (seconds)') ]),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', {
							'id': 'pn-scanner-duration',
							'type': 'text',
							'placeholder': 'optional',
							'style': 'max-width: 28em;'
						})
					])
				]),
				E('div', { 'class': 'cbi-page-actions' }, [
					E('button', {
						'id': 'pn-scanner-run',
						'class': 'cbi-button cbi-button-action',
						'click': ui.createHandlerFn(this, 'handleRun')
					}, [ _('Run Scan') ]),
					' ',
					E('button', {
						'id': 'pn-scanner-clear',
						'class': 'cbi-button cbi-button-reset',
						'click': ui.createHandlerFn(this, 'handleClear')
					}, [ _('Clear Output') ])
				])
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('textarea', {
					'id': 'pn-scanner-output',
					'style': 'width: 100%; font-family: monospace; white-space: pre;',
					'readonly': true,
					'wrap': 'off',
					'rows': '20'
				}, [ this.outputText ])
			])
		]);

		setTimeout(() => this.handleModeChange(), 0);

		return view;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
