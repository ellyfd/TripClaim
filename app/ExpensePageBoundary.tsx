"use client";

import {Component,type ErrorInfo,type ReactNode} from "react";

type Props={children:ReactNode;onBack:()=>void};
type State={failed:boolean};

export default class ExpensePageBoundary extends Component<Props,State>{
 state:State={failed:false};
 static getDerivedStateFromError(){return{failed:true}}
 componentDidCatch(error:Error,info:ErrorInfo){console.error("Expense page render failed",error,info.componentStack)}
 render(){
  if(this.state.failed)return <main className="expense-workbench-page"><section className="expense-page-notice panel"><b>報帳資料暫時無法顯示</b><span>畫面已被安全保留，請重新載入；若仍無法開啟，可先返回共同行程。</span><div><button onClick={()=>this.setState({failed:false})}>重新載入報帳</button><button className="secondary" onClick={this.props.onBack}>返回共同行程</button></div></section></main>;
  return this.props.children;
 }
}
