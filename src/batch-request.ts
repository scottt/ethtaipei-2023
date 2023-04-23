import Web3 from 'web3';
import { BatchRequest as Web3BatchRequest } from 'web3-core';
import { Method as Web3CoreMethod } from 'web3-core-method';

export class BatchRequest {
  b: Web3BatchRequest;
  results: any[];
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
  resultsFilled: number;

  constructor(web3: Web3) {
    this.b = new web3.BatchRequest();
    this.results = [];
    this.resolve = null;
    this.reject = null;
    this.resultsFilled = 0;
  }
  web3BatchRequestCallBack(index, err, result) {
    /* if any request in our batch fails, reject the promise we return from `execute` */
    if (err) {
      this.reject(new Error(`request ${index} failed: ${err}`))
      return;
    }
    this.results[index] = result;
    this.resultsFilled++;
    if (this.resultsFilled === this.results.length) {
      this.resolve(this.results);
    }
  }
  resultPromiseExecutor(resolve, reject) {
    this.resolve = resolve;
    this.reject = reject;
  }
  add(method: Web3CoreMethod) {
    const index = this.results.length;
    ((method as unknown) as any).callback = (err, result) => {
      this.web3BatchRequestCallBack(index, err, result)
    };
    this.b.add(method);
    this.results.push(undefined);
  }
  execute(): Promise<any> {
    const p = new Promise((resolve, reject) => { this.resultPromiseExecutor(resolve, reject) });
    /* must arrange for resultPromiseExecutor to be called before b.execute */
    this.b.execute();
    return p;
  }
}
