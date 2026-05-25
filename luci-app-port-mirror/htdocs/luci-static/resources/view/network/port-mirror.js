'use strict';
'require view';
'require form';
'require tools.widgets as widgets';

return view.extend({
	render: function() {
		var m, s, o;

		m = new form.Map('port-mirror', _('Port Mirroring'),
			_('Configure tc-based port mirroring rules. For best results, select switch or DSA user ports.'));

		s = m.section(form.TypedSection, 'mirror', _('Mirror Rules'));
		s.anonymous = false;
		s.addremove = true;
		s.sortable = true;

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.default = o.enabled;
		o.rmempty = false;

		o = s.option(widgets.DeviceSelect, 'source', _('Source interface'));
		o.noaliases = true;
		o.noinactive = true;
		o.rmempty = false;

		o = s.option(widgets.DeviceSelect, 'target', _('Target interface'));
		o.noaliases = true;
		o.noinactive = true;
		o.rmempty = false;

		o = s.option(form.Flag, 'ingress', _('Mirror ingress traffic'));
		o.default = o.enabled;
		o.rmempty = false;

		o = s.option(form.Flag, 'egress', _('Mirror egress traffic'));
		o.default = o.enabled;
		o.rmempty = false;

		o = s.option(form.DummyValue, '_constraints', _('Backend constraints'));
		o.rawhtml = true;
		o.default = _(
			'Source and target must be different existing devices, at least one direction must be enabled, and only one enabled rule per source device is supported.'
		);

		return m.render();
	}
});