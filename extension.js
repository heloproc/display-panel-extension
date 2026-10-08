import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const DBusInterface = `
<node>
  <interface name="org.gnome.Shell.Extensions.DisplayPanel">
    <method name="SetContrast"><arg type="d" name="contrast" direction="in"/></method>
    <method name="SetBrightness"><arg type="d" name="brightness" direction="in"/></method>
    <method name="SetSaturation"><arg type="d" name="saturation" direction="in"/></method>
    <method name="SetHue"><arg type="d" name="hue" direction="in"/></method>
    <method name="SetTemperature"><arg type="d" name="temperature" direction="in"/></method>
  </interface>
</node>`;

const SHADER_SRC = `
uniform sampler2D tex;
uniform float brightness;
uniform float contrast;
uniform float saturation;
uniform float hue;
uniform float temperature;

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main(void) {
    vec4 color = cogl_color_in * texture2D(tex, cogl_tex_coord_in[0].st);

    if (color.a > 0.0) {
        vec3 rgb = color.rgb / color.a; // Un-premultiply

        rgb = (rgb - 0.5) * contrast + 0.5 + brightness;

        vec3 hsv = rgb2hsv(rgb);
        hsv.x = fract(hsv.x + hue);
        hsv.y = hsv.y * saturation;
        rgb = hsv2rgb(hsv);

        rgb.r = rgb.r * (1.0 + temperature);
        rgb.b = rgb.b * (1.0 - temperature);

        rgb = clamp(rgb, 0.0, 1.0);

        color.rgb = rgb * color.a; // Re-premultiply
    }

    cogl_color_out = color;
}
`;

export default class DisplayPanelExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        try {
            this._effect = new Clutter.ShaderEffect();
        } catch (e) {
            this._effect = new Clutter.ShaderEffect({ shader_type: Clutter.ShaderType.FRAGMENT_SHADER });
        }

        this._effect.set_shader_source(SHADER_SRC);
        this._applyAllSettings();

        Main.uiGroup.add_effect(this._effect);

        if (Main.screenshotUI) {
            this._effect.set_enabled(!Main.screenshotUI.visible);

            this._screenshotVisibleId = Main.screenshotUI.connect('notify::visible', () => {
                this._effect.set_enabled(!Main.screenshotUI.visible);
            });
        }

        this._settings.connectObject(
            'changed::brightness',   () => this._updateUniform('brightness',   this._settings.get_double('brightness')),
            'changed::contrast',     () => this._updateUniform('contrast',     this._settings.get_double('contrast')),
            'changed::saturation',   () => this._updateUniform('saturation',   this._settings.get_double('saturation')),
            'changed::hue',          () => this._updateUniform('hue',          this._settings.get_double('hue')),
            'changed::temperature',  () => this._updateUniform('temperature',  this._settings.get_double('temperature')),
            this
        );

        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(DBusInterface, this);
        this._dbusImpl.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/DisplayPanel');
    }

    _applyAllSettings() {
        this._updateUniform('brightness',  this._settings.get_double('brightness'));
        this._updateUniform('contrast',    this._settings.get_double('contrast'));
        this._updateUniform('saturation',  this._settings.get_double('saturation'));
        this._updateUniform('hue',         this._settings.get_double('hue'));
        this._updateUniform('temperature', this._settings.get_double('temperature'));
    }

    _updateUniform(name, value) {
        if (!this._effect) return;
        const gval = new GObject.Value();
        gval.init(GObject.TYPE_FLOAT);
        gval.set_float(value);
        this._effect.set_uniform_value(name, gval);
    }

    SetContrast(val)     { this._settings.set_double('contrast',     val); }
    SetBrightness(val)   { this._settings.set_double('brightness',   val); }
    SetSaturation(val)   { this._settings.set_double('saturation',   val); }
    SetHue(val)          { this._settings.set_double('hue',          val); }
    SetTemperature(val)  { this._settings.set_double('temperature',  val); }

    disable() {
        if (this._screenshotVisibleId && Main.screenshotUI) {
            Main.screenshotUI.disconnect(this._screenshotVisibleId);
            this._screenshotVisibleId = null;
        }

        if (this._settings) {
            this._settings.disconnectObject(this);
            this._settings = null;
        }

        if (this._effect) {
            Main.uiGroup.remove_effect(this._effect);
            this._effect = null;
        }

        if (this._dbusImpl) {
            this._dbusImpl.unexport();
            this._dbusImpl = null;
        }
    }
}
