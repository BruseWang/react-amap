import React from 'react';
import { render } from 'react-dom';
import APILoader from '../../lib/utils/APILoader';
import isFun from '../../lib/utils/isFun';
import error from '../../lib/utils/error';

import Markers from '../Markers';
import Polygon from '../Polygon';
import Polyline from '../Polyline';
import InfoWindow from '../InfoWindow';
import Circle from '../Circle';
import GroundImage from '../GroundImage';
import CircleEditor from '../CircleEditor';
import PolyEditor from '../PolyEditor';

/*
 * props
 * {
 *  onInit(func),
 *  center,
 *  zoom
 * }
 */

const Component = React.Component;
const Children = React.Children;
const ComponentList = [
  Circle,
  GroundImage,
  InfoWindow,
  Markers,
  Polyline,
  Polygon,
];

const defaultOpts = {
  MapType: {
    showRoad: false,
    showTraffic: false,
    defaultType: 0,
  },
  ToolBar: {
    position: 'RB',
    noIpLocate: true,
    locate: true,
    liteStyle: true,
    autoPosition: false,
  },
  OverView: {},
};

class AMap extends Component {
  constructor() {
    super();
    this.state = {
      mapLoaded: false,
    };
    this.pluginMap = {};
    this.prevCenter = undefined;
    this.prevZoom = undefined;
    this.loader = new APILoader().load();
  }
  
  componentWillReceiveProps(nextProps) {
    this.loader.then(() => {
      if (this.map) {
        this.setZoomAndCenter(nextProps);
        this.setPlugins(nextProps);
      }
    });
  }
  
  componentDidMount() {
    this.loadMap();
  }
  
  componentDidUpdate() {
    this.loadMap();
  }
  
  loadMap() {
    this.loader.then(() => {
      this.initMapInstance();
      if (!this.state.mapLoaded) {
        this.setState({
          mapLoaded: true,
        });
      }
    });
  }
  
  renderChildren() {
    return Children.map(this.props.children, (child) => {
      if (ComponentList.indexOf(child.type) === -1) {
        return child;
      }
      return React.cloneElement(child, {
        __map__: this.map,
        __ele__: this.mapWrapper,
      })
    });
  }
  
  initMapInstance() {
    if (!this.map) {
      let opts = {};
      if ('createOptions' in this.props) {
        opts = this.props.createOptions;
      } else {
        if ('zoom' in this.props) {
          opts.zoom = this.props.zoom;
          this.prevZoom = opts.zoom;
        }
        if ('center' in this.props) {
          opts.center = new window.AMap.LngLat(
            this.props.center.longitude,
            this.props.center.latitude
          );
          this.prevCenter = opts.center;
        }
      }
      this.map = new window.AMap.Map(this.mapWrapper, opts);
      const events = this.exposeMapInstance();
      events && this.bindAMapEvents(events);
      this.setPlugins(this.props);
    }
  }
  
  bindAMapEvents(events){
    const list = Object.keys( events );
    list.length && list.forEach((evName) => {
      this.map.on(evName,events[evName]);
    });
  }
  
  setZoomAndCenter(props) {
    if ((this.prevCenter === props.center) && (this.prevZoom === props.zoom)) {
      // do nothing
    } else {
      this.prevCenter = props.center;
      this.prevZoom = props.zoom;
      let zoomChange = false,
        centerChange = false,
        newCenter;
      if ('zoom' in props) {
        if (props.zoom !== this.map.getZoom()) {
          zoomChange = true;
        }
      }
      
      if ('center' in props) {
        newCenter = new window.AMap.LngLat(props.center.longitude, props.center.latitude);
        if (props.center !== this.props.center) {
          centerChange = true;
        }
      }
      if (zoomChange) {
        if (centerChange) {
          this.map.setZoomAndCenter(props.zoom, newCenter);
        } else {
          this.map.setZoom(props.zoom);
        }
      } else {
        if (centerChange) {
          this.map.setCenter(newCenter);
        }
      }
    }
  }
  
  setPlugins(props) {
    const pluginList = ['Scale', 'ToolBar', 'MapType', 'OverView'];
    if ('plugins' in props) {
      const plugins = props.plugins;
      if (plugins && plugins.length) {
        plugins.forEach((p) => {
          let name, config, visible;
          if (typeof p === 'string') {
            name = p;
            config = null;
            visible = true;
          } else {
            name = p.name;
            config = p.options;
            visible = (('visible' in config) && (typeof config.visible === 'boolean')) ? config.visible: true;
            delete config.visible;
          }
          const idx = pluginList.indexOf(name);
          if (idx === -1) {
            error('INVALID_AMAP_PLUGIN');
          } else {
            if (visible) {
              pluginList.splice(idx, 1);
              this.installPlugin(name, config);
            }
          }
        });
      }
    }
    this.removeOrDisablePlugins(pluginList);
  }
  
  removeOrDisablePlugins(plugins) {
    if (plugins && plugins.length) {
      plugins.forEach((p) => {
        if (p in this.pluginMap) {
          this.pluginMap[p].hide();
        }
      })
    }
  }
  
  installPlugin(name, opts) {
    opts = opts || {};
    switch(name) {
      case 'Scale':
        this.setScalePlugin(opts);
        break;
      case 'ToolBar':
        this.setToolbarPlugin(opts);
        break;
      case 'OverView':
        this.setOverviewPlugin(opts);
        break;
      case 'MapType':
        this.setMapTypePlugin(opts);
        break;
      default:
      // do nothing
    }
  }
  
  setMapTypePlugin(opts) {
    if (this.pluginMap['MapType']) {
      this.pluginMap.MapType.show();
    } else {
      const { onCreated, ...restOpts } = opts;
      const initOpts = {...defaultOpts.MapType, ...restOpts};
      this.map.plugin(['AMap.MapType'], () => {
        this.pluginMap.MapType = new window.AMap.MapType(initOpts);
        this.map.addControl(this.pluginMap.MapType);
        if (isFun(onCreated)) {
          onCreated(this.pluginMap.MapType);
        }
      });
    }
  }
  
  setOverviewPlugin(opts) {
    if (this.pluginMap['OverView']) {
      this.pluginMap.OverView.show();
    } else {
      const { onCreated, ...restOpts } = opts;
      const initOpts = {...defaultOpts.OverView, ...restOpts};
      this.map.plugin(['AMap.OverView'], () => {
        this.pluginMap.OverView = new window.AMap.OverView(initOpts);
        this.map.addControl(this.pluginMap.OverView);
        if (isFun(onCreated)) {
          onCreated(this.pluginMap.OverView);
        }
      });
    }
  }
  
  setScalePlugin(opts) {
    if (this.pluginMap['Scale']) {
      this.pluginMap.Scale.show();
    } else {
      this.map.plugin(['AMap.Scale'], () => {
        this.pluginMap.Scale = new window.AMap.Scale();
        this.map.addControl(this.pluginMap.Scale);
        if (isFun(opts.onCreated)) {
          opts.onCreated(this.pluginMap.Scale);
        }
      });
    }
  }
  
  setToolbarPlugin(opts) {
    if (this.pluginMap['ToolBar']) {
      this.pluginMap.ToolBar.show();
    } else {
      const { onCreated, ...restOpts } = opts;
      const initOpts = {...defaultOpts.ToolBar, ...restOpts};
      this.map.plugin(['AMap.ToolBar'], () => {
        this.pluginMap.ToolBar = new window.AMap.ToolBar(initOpts);
        this.map.addControl(this.pluginMap.ToolBar);
        if (isFun(onCreated)) {
          onCreated(this.pluginMap.ToolBar);
        }
      });
    }
  }
  
  // 用户可以通过 onCreated 事件获取 map 实例
  exposeMapInstance() {
    if ('events' in this.props) {
      const events = this.props.events || {};
      if (isFun(events.created)) {
        events.created(this.map);
        delete events.created;
      }
      return events;
    }
    return false;
  }
  
  render() {
    return (<div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={(div)=>{this.mapWrapper = div }} style={{ width: '100%', height: '100%' }}>
        <div style={{ background: '#eee', width: '100%', height: '100%' }}></div>
      </div>
      <div>
        { this.state.mapLoaded ? this.renderChildren() : null }
      </div>
    </div>);
  }
}

AMap.Markers = Markers;
AMap.Polygon = Polygon;
AMap.Polyline = Polyline;
AMap.InfoWindow = InfoWindow;
AMap.Circle = Circle;
AMap.GroundImage = GroundImage;
AMap.CircleEditor = CircleEditor;
AMap.PolyEditor = PolyEditor;

export default AMap;
