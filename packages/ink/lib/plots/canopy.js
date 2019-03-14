'use babel';
/** @jsx etch.dom */

import etch from 'etch';
import { prewalk, postwalk, prefor } from './tree.js';
import { Etch, Tip, Button, toView } from '../util/etch.js';

function clamp (x, min, max) {
  return Math.min(Math.max(x, min), max)
}

function maprange([x1, x2], [y1, y2], x) {
  return (x-x1)/(x2-x1)*(y2-y1)+y1;
}

function dims(tree) {
  [tree.height, tree.width] = [1, 1];
  [tree.top, tree.left] = [0, 0];
  prewalk(tree, (parent) => {
    let left = parent.left;
    parent.children.forEach(ch => {
      ch.width = ch.count / parent.count * parent.width;
      ch.height = maprange([0,1],[1/5,1],ch.count/parent.count)*parent.height;
      ch.left = left;
      ch.top = parent.top + parent.height;
      left += ch.width;
    });
    // Centre align children
    chwidth = parent.children.map(({width})=>width).reduce((a,b)=>a+b, 0);
    parent.children.forEach(ch => ch.left += (parent.width-chwidth)/2);
    return parent;
  });
  // Scale total height to 100%
  let max = postwalk(tree, ({height, children}) =>
    Math.max(height, ...children.map(x=>x+height)));
  prewalk(tree, (node) => {
    node.top /= max;
    node.height /= max;
    return node;
  });
  return tree;
}

class Clickable extends Etch {
  hypot([x1, x2], [y1, y2]) {
    return Math.sqrt(Math.pow(y1-x1,2)+Math.pow(y2-x2,2));
  }
  onclick(e) {
    if (!this.clickStart) return;
    if (this.hypot(this.clickStart, [e.clientX, e.clientY]) < 5)
      this.props.onclick(e);
    this.clickStart = null;
  }
  render() {
    return <span onmousedown={e=>this.clickStart=[e.clientX,e.clientY]}
                 onclick={e=>this.onclick(e)}
                 onmouseleave={e=>this.clickStart=null}>{
      this.children
    }</span>;
  }
}

export class Pannable extends Etch {
  constructor (item, opts) {
    opts = Object.assign({}, {
      zoomstrategy: 'transform',
      minScale: 0.01,
      maxScale: 50
    }, opts)

    super()

    this.item = item
    this.zoomstrategy = opts.zoomstrategy
    this.minScale = opts.minScale
    this.maxScale = opts.maxScale
    this.left = 0
    this.top = 0
    // force update, so readAfterUpdate gets executed
    this.update()
  }

  toolbarView () {
    return <div className='btn-group'>
      <Button icon='plus' alt='Zoom In' onclick={() => this.zoom(null, 1.1)}/>
      <Button icon='dash' alt='Zoom Out' onclick={() => this.zoom(null, 0.9)}/>
      <Button icon='screen-normal' alt='Reset Plot' onclick={() => this.resetAll()}/>
    </div>
  }

  resetAll () {
    this.scale = 1
    this.left = 0
    this.top = 0
    this.update()
  }

  ondrag({movementX, movementY}) {
    if (!this.dragging) return;

    this.left += movementX
    this.top += movementY
    this.update();
  }

  zoom(e, amount) {
    const zoom = amount || Math.pow(0.99, e.deltaY)

    if (zoom*this.scale > this.maxScale || zoom*this.scale < this.minScale) return

    this.scale *= zoom

    if (this.containerRect) {
      let x, y
      if (amount) {
        x = this.containerRect.width/2
        y = this.containerRect.height/2
      } else {
        x = clamp(e.clientX - this.containerRect.left, 0, this.containerRect.width)
        y = clamp(e.clientY - this.containerRect.top, 0, this.containerRect.height)
      }

      this.left -= x*zoom - x
      this.top -= y*zoom - y
    }
    this.update();
  }

  render() {
    if (!this.scale) this.scale = 1
    const scale = this.scale*100+'%'

    this.toolbar = [this.toolbarView()]

    if (this.item && this.item.toolbar) {
      this.toolbar = this.toolbar.concat(this.item.toolbar)
    }

    let position = {position:'relative', height:'inherit', width:'inherit', transformOrigin: '0px 0px'}

    if (this.zoomstrategy == 'width') {
      position.transform = 'translate('+this.left+'px,'+this.top+'px)'
      position.height = scale
      position.width = scale
    } else if (this.zoomstrategy == 'transform') {
      position.transform = 'translate('+this.left+'px,'+this.top+'px) scale('+this.scale+')'
    }

    return <div style={{height:'100%',width:'100%'}}
                onmousedown={e=>this.dragging=true}
                onmouseup={e=>this.dragging=false}
                onmouseleave={e=>this.dragging=false}
                onmousemove={e=>this.ondrag(e)}
                onmousewheel={e=>this.zoom(e)}
                ondblclick={e=>this.resetAll()}>
      <div style={position} className='ink-pannable'>
        {toView(this.item)}
      </div>
    </div>;
  }

  readAfterUpdate () {
    this.containerRect =
      this.element.getElementsByClassName('ink-pannable')[0].getBoundingClientRect()
  }

  teardown () {
    if (this.item && this.item.teardown) this.item.teardown()
    etch.update(this)
  }

  build () {
    if (this.item && this.item.build) this.item.build()
    etch.update(this)
  }
}

class NodeView extends Etch {
  render() {
    let {height, width, top, left, onclick, onmouseover, onmouseout} = this.props;
    return <Clickable onclick={onclick}><div className='node' {...{onmouseover, onmouseout}} style={{
      height: 100*height+'%',
      width:  100*width +'%',
      top:    100*top   +'%',
      left:   100*left  +'%'
    }}>
      <div><div></div></div>
    </div></Clickable>;
  }
}

export default class Canopy extends Etch {
  update({data}) {}
  render() {
    let nodes = [];
    prefor(dims(this.props.data), node => nodes.push(<NodeView {...node} />));
    return <div className="ink-canopy">
      {nodes}
    </div>;
  }
}
