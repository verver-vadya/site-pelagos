import {Component,type ReactNode} from 'react';
export default class SceneBoundary extends Component<{children:ReactNode;fallback?:ReactNode;onError?:()=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error){console.error('Marine scene unavailable:',error);this.props.onError?.();}
  render(){return this.state.failed?this.props.fallback??null:this.props.children;}
}
