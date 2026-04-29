import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class DisplayPanelPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        window.set_title(_('Display Panel'));
        window.set_default_size(600, 500);
        window.search_enabled = false;

        const page = new Adw.PreferencesPage({
            title: _('Display'),
            icon_name: 'preferences-desktop-display-symbolic',
        });
        window.add(page);

        const colorGroup = new Adw.PreferencesGroup({
            title: _('Color Adjustments'),
            description: _('Fine-tune how colors appear on your screen'),
        });
        page.add(colorGroup);

        colorGroup.add(this._makeSliderRow(
            settings,
            'brightness',
            _('Brightness'),
            _('Offset applied to overall brightness'),
            -0.5, 0.5, 0.0, 100,   // min, max, default, scale-factor for display
            v => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}`,
        ));

        colorGroup.add(this._makeSliderRow(
            settings,
            'contrast',
            _('Contrast'),
            _('Multiplier applied to contrast'),
            0.5, 2.0, 1.0, 100,
            v => `${Math.round(v * 100)}%`,
        ));

        colorGroup.add(this._makeSliderRow(
            settings,
            'saturation',
            _('Saturation'),
            _('Color saturation — 0 is greyscale, 1 is normal'),
            0.0, 2.0, 1.0, 100,
            v => `${Math.round(v * 100)}%`,
        ));

        // White balance 
        const wbGroup = new Adw.PreferencesGroup({
            title: _('White Balance'),
            description: _('Adjust color temperature and hue shift'),
        });
        page.add(wbGroup);

        wbGroup.add(this._makeSliderRow(
            settings,
            'temperature',
            _('Temperature'),
            _('Negative = cooler (blue), positive = warmer (orange)'),
            -1.0, 1.0, 0.0, 100,
            v => {
                if (Math.abs(v) < 0.01) return _('Neutral');
                return v > 0
                    ? `+${Math.round(v * 100)} ${_('Warm')}`
                    : `${Math.round(v * 100)} ${_('Cool')}`;
            },
        ));

        wbGroup.add(this._makeSliderRow(
            settings,
            'hue',
            _('Hue Shift'),
            _('Rotates all hues on screen'),
            -0.5, 0.5, 0.0, 100,
            v => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}`,
        ));

        const resetGroup = new Adw.PreferencesGroup();
        page.add(resetGroup);

        const resetRow = new Adw.ActionRow({
            title: _('Reset All'),
            subtitle: _('Restore every slider to its default value'),
        });

        const resetBtn = new Gtk.Button({
            label: _('Reset'),
            valign: Gtk.Align.CENTER,
            css_classes: ['destructive-action'],
        });
        resetBtn.connect('clicked', () => {
            settings.reset('brightness');
            settings.reset('contrast');
            settings.reset('saturation');
            settings.reset('hue');
            settings.reset('temperature');
        });

        resetRow.add_suffix(resetBtn);
        resetGroup.add(resetRow);
    }

    /**
     * Build an Adw.ActionRow with a Gtk.Scale and a live value label.
     *
     * @param {Gio.Settings} settings
     * @param {string}       key          GSettings key name
     * @param {string}       title        Row title
     * @param {string}       subtitle     Row subtitle / description
     * @param {number}       min
     * @param {number}       max
     * @param {number}       defaultVal   Used to draw the default marker
     * @param {number}       steps        Number of discrete steps for the slider
     * @param {Function}     fmt          Value → display string
     */
    _makeSliderRow(settings, key, title, subtitle, min, max, defaultVal, steps, fmt) {
        const row = new Adw.ActionRow({ title, subtitle });

        // Values
        const valueLabel = new Gtk.Label({
            label: fmt(settings.get_double(key)),
            valign: Gtk.Align.CENTER,
            width_chars: 9,
            xalign: 1,
            css_classes: ['dim-label', 'numeric'],
        });

        // Slider
        const scale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: min,
                upper: max,
                step_increment: (max - min) / steps,
                page_increment: (max - min) / 10,
                value: settings.get_double(key),
            }),
            draw_value: false,
            hexpand: true,
            valign: Gtk.Align.CENTER,
            width_request: 200,
        });

       scale.add_mark(defaultVal, Gtk.PositionType.BOTTOM, null);

         scale.connect('value-changed', () => {
            const v = scale.get_value();
            settings.set_double(key, v);
            valueLabel.label = fmt(v);
        });

        settings.connect(`changed::${key}`, () => {
            const v = settings.get_double(key);
            
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                scale.set_value(v);
                valueLabel.label = fmt(v);
                return GLib.SOURCE_REMOVE;
            });
        });

        row.add_suffix(scale);
        row.add_suffix(valueLabel);
        row.set_activatable_widget(scale);

        return row;
    }
}
