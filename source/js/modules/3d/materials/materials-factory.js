import * as THREE from "three";
import CustomShaderMaterial from "./custom-shader-material";
import CustomPlanesMaterial from "./custom-planes-material";
import {isDesktop} from "../../../common/const";
import {MatcapMaps} from "../../../common/enums";
import {isArray} from "lodash";

class MaterialsFactory {
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.get = this.get.bind(this);
  }

  get(material) {
    const {type, color, doubleSide, transparent, options} = material;
    const materialConfig = this.getMaterialConfig(type);
    if (color) {
      if (typeof color === `object` && !isArray(color)) {
        materialConfig.options.colors = [];
        Object.entries(color).forEach(([key, value]) => {
          materialConfig.options.colors.push(
              {
                name: key,
                value,
              },
          );
        });
      } else {
        materialConfig.options.color = color;
      }
    }

    if (doubleSide) {
      materialConfig.options.side = THREE.DoubleSide;
    }

    if (transparent) {
      materialConfig.options.transparent = true;
    }

    if (options) {
      materialConfig.options = {...materialConfig.options, ...options};
    }

    return this.create(materialConfig);
  }

  create(materialConfig) {
    const {type, reflection, options} = materialConfig;
    switch (type) {
      case `basic`: {
        return this._getBasicMaterial(options);
      }
      case `phong`: {
        return this._getPhongMaterial(options, reflection);
      }
      case `custom`: {
        return this._getCustomMaterial(options, reflection);
      }
      case `customPlanes`: {
        return this._getCustomPlanesMaterial(options);
      }
      default: {
        return this._getStandardMaterial(options, reflection);
      }
    }
  }

  getMaterialColor(name) {
    return isArray(name) ? new THREE.Color(...name) : MaterialsFactory.Colors[name];
  }

  getMaterialConfig(type) {
    return {...MaterialsFactory.Configs[type]};
  }

  getMaterialReflectionOptions(reflection) {
    switch (reflection) {
      case `basic`: {
        return {
          roughness: 0.6,
          metalness: 0.6,
        };
      }
      case `strong`: {
        return {
          shininess: 0,
          specular: 0xffffff,
        };
      }
      default: {
        return {
          roughness: 0.95,
          metalness: 0.0,
        };
      }
    }
  }

  getCustomMaterialUniforms(reflection, colors, additionalUniforms) {
    const reflectionOptions = this.getMaterialReflectionOptions(reflection);
    const colorUniforms = colors.reduce((acc, color) => {
      const materialColor = this.getMaterialColor(color.value);
      acc[color.name] = {value: new THREE.Color(materialColor)};

      return acc;
    }, {});

    return {
      roughness: {value: reflectionOptions.roughness},
      metalness: {value: reflectionOptions.metalness},
      ...colorUniforms,
      ...additionalUniforms
    };
  }

  _getMeshMatcapMaterial(url, options) {
    const matcap = this.textureLoader.load(url);
    options = {...options, color: this.getMaterialColor(options.color), matcap};
    return new THREE.MeshMatcapMaterial(options);
  }

  _getBasicMaterial(options) {
    options = {...options, color: this.getMaterialColor(options.color)};
    return new THREE.MeshBasicMaterial(options);
  }

  _getStandardMaterial(options, reflection) {
    if (isDesktop) {
      if (reflection) {
        options = {...options, ...this.getMaterialReflectionOptions(reflection)};
      }
      options = {...options, color: this.getMaterialColor(options.color)};
      return new THREE.MeshStandardMaterial(options);
    } else {
      const matcapUrl = MatcapMaps[reflection];
      return this._getMeshMatcapMaterial(matcapUrl, options);
    }
  }

  _getPhongMaterial(options, reflection) {
    if (isDesktop) {
      if (reflection) {
        options = {...options, ...this.getMaterialReflectionOptions(reflection)};
      }
      options = {...options, color: this.getMaterialColor(options.color)};
      return new THREE.MeshPhongMaterial(options);
    } else {
      const matcapUrl = MatcapMaps[reflection];
      return this._getMeshMatcapMaterial(matcapUrl, options);
    }
  }

  _getCustomMaterial(options, reflection) {
    const {name, colors, shaders, additional} = options;
    if (isDesktop) {
      const uniforms = this.getCustomMaterialUniforms(reflection, colors, additional);
      return new CustomShaderMaterial(name, shaders, uniforms);
    } else {
      const mainColor = colors.find((color) => color.name === `mainColor`);
      const matcapUrl = MatcapMaps[reflection];
      return this._getMeshMatcapMaterial(matcapUrl, {color: mainColor.value});
    }
  }

  _getCustomPlanesMaterial(options) {
    const {texture} = options;
    return new CustomPlanesMaterial(texture);
  }
}

MaterialsFactory.Configs = {
  StandardSoft: {
    type: `standard`,
    reflection: `soft`,
    options: {},
  },
  StandardBasic: {
    type: `standard`,
    reflection: `basic`,
    options: {},
  },
  PhongStrong: {
    type: `phong`,
    reflection: `strong`,
    options: {},
  },
  CustomPlanes: {
    type: `customPlanes`,
    options: {},
  },
  CustomSoftCarpet: {
    type: `custom`,
    reflection: `soft`,
    options: {
      name: `standard`,
      shaders: `carpet`,
      additional: {
        stripesCount: new THREE.Uniform(7)
      }
    },
  },
  CustomSoftRoad: {
    type: `custom`,
    reflection: `soft`,
    options: {
      name: `standard`,
      shaders: `road`,
      additional: {
        stripesCount: new THREE.Uniform(9),
        stripesSize: new THREE.Uniform(20),
      }
    },
  },
};

MaterialsFactory.Colors = {
  Blue: `rgb(51, 113, 235)`,
  BrightBlue: `rgb(47, 58, 201)`,
  LightBlue: `rgb(150, 176, 243)`,
  DarkBlue:	`rgb(12, 49, 112)`,
  SkyLightBlue:	`rgb(161, 200, 240)`,
  MountainBlue:	`rgb(101, 152, 219)`,
  DominantRed: `rgb(255, 32, 66)`,
  LightDominantRed: `rgb(255, 105, 120)`,
  ShadowedDominantRed: `rgb(124, 26, 48)`,
  Purple: `rgb(163, 118, 235)`,
  BrightPurple:	`rgb(118, 76, 225)`,
  LightPurple: `rgb(194, 153, 225)`,
  AdditionalPurple: `rgb(119, 85, 189)`,
  DarkPurple:	`rgb(76, 49, 121)`,
  ShadowedPurple:	`rgb(75, 50, 116)`,
  ShadowedBrightPurple:	`rgb(56, 37, 108)`,
  ShadowedLightPurple:	`rgb(77, 53, 106)`,
  ShadowedAdditionalPurple:	`rgb(55, 38, 89)`,
  ShadowedDarkPurple:	`rgb(49, 42, 71)`,
  Grey:	`rgb(118, 125, 143)`,
  MetalGrey:	`rgb(126, 141, 164)`,
  Orange:	`rgb(230, 80, 0)`,
  Green:	`rgb(0, 210, 134)`,
  White:	`rgb(255, 255, 255)`,
  SnowColor:	`rgb(182, 206, 240)`,
};

export default MaterialsFactory;
