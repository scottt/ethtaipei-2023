import Web3 from "web3";
import BN from "bn.js";
import { BatchRequest } from "./batch-request";
import QRCode from "qrcode"; // qrcode generator
import jsQR from "jsqr"; // qrcode scanner

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function formatError(e): string {
  return `${e.name}: ${e.message}`;
}

function appendError(e) {
  console.log("appendError:", e);
  const d = document.getElementById("message");
  d.innerHTML = "<p>" + formatError(e) + "</p>" + d.innerHTML;
}

const isValidFloatRe = new RegExp("^[0-9]+(\\.[0-9]*)?$");
function strIsValidFloat(s) {
  return isValidFloatRe.test(s);
}

function numericStrDot2F(s) {
  if (s.length == 0) {
    return "0.00";
  } else if (s.length == 1) {
    return `0.0${s}`;
  } else if (s.length == 2) {
    return `0.${s}`;
  } else {
    return `${s.slice(0, s.length - 2)}.${s.slice(s.length - 2, s.length)}`;
  }
}

function formatTokenValue(val, decimals, toBN) {
  console.log(
    "formatTokenValue: val:",
    val,
    typeof val,
    "decimals:",
    decimals,
    typeof decimals
  );
  const tenBn = toBN(10);
  if (decimals < 2) {
    return val.toString();
  }
  const eMinusTwo = tenBn.pow(toBN(decimals - 2));
  return numericStrDot2F(toBN(val).div(eMinusTwo).toString());
}

// strAndDecimalsToBn('1.234', 3) -> toBN('1234')
function strAndDecimalsToBn(s, decimals, toBN) {
  let i = s.lastIndexOf(".");
  if (i === -1) {
    const input = s + "0".repeat(decimals);
    //console.log('input:', input);
    return toBN(input);
  }
  const f = s.slice(i + 1, s.length);
  const w = s.slice(0, i);
  if (decimals === 0) {
    let input;
    if (f === "0" || f === "") {
      input = w; // '123.0' -> '123', '123.' -> '123'
    } else {
      input = s; // `s` contains '.', toBN should throw exceptions
    }
    //console.log('input:', input);
    return toBN(input);
  }
  // at this point: i !== -1, decimals !== 0
  if (f.length > decimals) {
    throw new Error(
      `Too many digits after decimal point: ${s}, decimals: ${decimals}`
    );
  }
  const input = w + f + "0".repeat(decimals - f.length);
  //console.log('f:', f, 'input:', input);
  return toBN(input);
}

export class App {
  storageKeyForPrivateKey: string;
  web3: Web3;
  chainId: number;
  fromAddress: string;
  token: any;
  decimals: number;
  tokenSymbol: string;
  valueDom: HTMLInputElement;
  toAddressDom: HTMLInputElement;
  submitDom: HTMLButtonElement;
  mintDom: HTMLButtonElement;
  oldValueStr: string = "";
  oldBalance: BN = new BN(0);
  tokenManagerUrl: string;
  scanCanvasDom: HTMLCanvasElement;
  scanVideoDom: HTMLVideoElement;
  scanCanvasContext: CanvasRenderingContext2D;
  eventHandlersAdded: boolean = false;

  constructor(
    storageKeyForPrivateKey: string,
    web3: Web3,
    chainId: number,
    fromAddress: string,
    token: any,
    tokenManagerUrl: string
  ) {
    this.storageKeyForPrivateKey = storageKeyForPrivateKey;
    this.web3 = web3;
    this.chainId = chainId;
    this.fromAddress = fromAddress;
    this.token = token;
    this.tokenManagerUrl = tokenManagerUrl;
  }

  addEventHandlers() {
    this.valueDom.addEventListener("input", this.onValueInput.bind(this));
    this.valueDom.addEventListener("input", this.onInput.bind(this));
    this.toAddressDom.addEventListener("input", this.onInput.bind(this));
    this.submitDom.addEventListener("click", this.onSubmit.bind(this));
    this.mintDom.addEventListener("click", this.onMint.bind(this));
    document
      .getElementById("to-address-scan-click")
      .addEventListener("click", this.onToAddressScanClick.bind(this));
    window.addEventListener("hashchange", this.onHashChange.bind(this));
    // monitor balance change
    setInterval(this.updateValues.bind(this), 1000);
    this.eventHandlersAdded = true;
  }

  async urlRoute(hash: string) {
    console.log("urlRoute: hash:", hash);
    const pages = <NodeListOf<HTMLElement>>(
      document.querySelectorAll("[id^=page-]")
    );
    const pageToAddressScanHash = "#to-address-scan";
    const pageSendToHash = "#send-to-";
    const pagePrivateKeyHash = "#private";
    const pagePrivateKeyClearHash = "#clear";
    for (let p of pages) {
      p.style.display = "none";
    }
    if (hash.startsWith(pageToAddressScanHash)) {
      this.pageToAddressScan();
    } else if (hash.startsWith(pageSendToHash)) {
      const toAddress = hash.slice("#send-to-".length);
      console.log("urlRoute: pageSendTo: toAddress:", toAddress);
      this.pageSendTo(toAddress);
    } else if (hash.startsWith(pagePrivateKeyHash)) {
      this.pagePrivateKey({ clearData: false });
    } else if (hash.startsWith(pagePrivateKeyClearHash)) {
      this.pagePrivateKey({ clearData: true });
    } else if (hash === "") {
      this.pageIndex();
    } else {
      console.log("ERROR: invalid URL pattern:", hash);
    }
  }

  async onHashChange(event: HashChangeEvent) {
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onhashchange#The_hashchange_event
    const u = new URL(event.newURL);
    this.urlRoute(u.hash);
  }

  async onLoad() {
    this.urlRoute(window.location.hash);
  }

  async pageSendTo(toAddress: string | null) {
    document.getElementById("address").innerHTML = `<b>${this.fromAddress}</b>`;
    this.generateQrCode();
    this.updateValues().then(() => {
      this.updateTransactionHistory();
    });
    document.getElementById("page-app").style.display = "block";
    this.valueDom = document.getElementById("value") as HTMLInputElement;
    this.toAddressDom = document.getElementById(
      "to-address"
    ) as HTMLInputElement;
    if (toAddress) {
      this.toAddressDom.value = toAddress;
    }
    this.submitDom = document.getElementById("submit") as HTMLButtonElement;
    if (!this.eventHandlersAdded) {
      this.addEventHandlers();
    }
  }

  async pageIndex() {
    this.pageSendTo(null);
  }

  drawLine(begin, end, color) {
    const c = this.scanCanvasContext;
    c.beginPath();
    c.moveTo(begin.x, begin.y);
    c.lineTo(end.x, end.y);
    c.lineWidth = 4;
    c.strokeStyle = color;
    c.stroke();
  }

  async pageToAddressScan() {
    document.getElementById("page-to-address-scan").style.display = "block";
    this.scanVideoDom = document.createElement("video");
    this.scanCanvasDom = document.getElementById(
      "to-address-scan-canvas"
    ) as HTMLCanvasElement;
    this.scanCanvasContext = this.scanCanvasDom.getContext("2d");

    // Use facingMode: environment to attemt to get the front camera on phones
    const video = this.scanVideoDom;
    const self = this;

    if (!navigator.mediaDevices) {
      appendError(new Error("Browser does not allow camera access"));
    } else {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((mediaStream) => {
          video.srcObject = mediaStream;
          video.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
          video.play();
          requestAnimationFrame(self.scanPageTick.bind(self));
        });
    }
  }

  scanPageTick() {
    const video = this.scanVideoDom;
    const canvasElement = this.scanCanvasDom;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvasElement.hidden = false;
      canvasElement.height = video.videoHeight;
      canvasElement.width = video.videoWidth;
      const c = this.scanCanvasContext;
      c.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
      const imageData = c.getImageData(
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code) {
        console.log("scanPageTick: code:", code);
        this.drawLine(
          code.location.topLeftCorner,
          code.location.topRightCorner,
          "#FF3B58"
        );
        this.drawLine(
          code.location.topRightCorner,
          code.location.bottomRightCorner,
          "#FF3B58"
        );
        this.drawLine(
          code.location.bottomRightCorner,
          code.location.bottomLeftCorner,
          "#FF3B58"
        );
        this.drawLine(
          code.location.bottomLeftCorner,
          code.location.topLeftCorner,
          "#FF3B58"
        );
        const address = code.data;
        if (this.web3.utils.isAddress(address)) {
          const video = this.scanVideoDom;
          const mediaStream = video.srcObject as MediaStream;
          const tracks = mediaStream.getTracks();
          tracks.forEach((track) => {
            track.stop();
          });
          this.scanVideoDom = null;
          window.location.hash = `#send-to-${address}`;
          return;
        }
      }
    }
    requestAnimationFrame(this.scanPageTick.bind(this));
  }

  async updateValues() {
    const b = new BatchRequest(this.web3);
    const token = this.token;
    const address = this.fromAddress;
    b.add(token.methods.decimals().call.request());
    b.add(token.methods.symbol().call.request());
    b.add(token.methods.balanceOf(address).call.request());
    const [decimals, tokenSymbol, balance] = await b.execute();
    this.decimals = decimals;
    this.tokenSymbol = tokenSymbol;
    const balanceBn = this.web3.utils.toBN(balance);
    const balanceDom = document.getElementById("balance");
    if (balanceDom.innerHTML == "" || !this.oldBalance.eq(balanceBn)) {
      balanceDom.innerHTML = `<b>${formatTokenValue(
        balanceBn,
        decimals,
        this.web3.utils.toBN
      )} ${tokenSymbol}</b>`;
      this.updateTransactionHistory();
    }
    this.oldBalance = balanceBn;
  }

  async updateTransactionHistory() {
    const params = [
      {
        tokenAddress: this.token.options.address,
        address: this.fromAddress,
        pageSize: 3,
        page: 1,
      },
    ];
    //console.log('updateTransactionHistory: params:', params);
    // const response = await fetch(this.tokenManagerUrl, {
    //   method: "POST",
    //   mode: "cors",
    //   cache: "no-cache",
    //   credentials: "omit",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   redirect: "follow",
    //   body: JSON.stringify({
    //     jsonrpc: "2.0",
    //     id: 1, // TODO: portal browser random int
    //     method: "tokenManager.ErcTransactions",
    //     params: params,
    //   }),
    // });
    // const data = await response.json();
    const data = { result: [] };
    const tDom = document.getElementById("transactions");
    const transactions = data["result"];
    let out = [];
    for (let i of transactions) {
      const f = this.web3.utils.toChecksumAddress(i.from);
      const t = this.web3.utils.toChecksumAddress(i.to);
      out.push(
        `<p>Time: ${new Date(
          i.timestamp
        ).toLocaleString()}</p><p>From: ${f}</p><p>To: ${t}</p><p>Value: ${formatTokenValue(
          i.value,
          this.decimals,
          this.web3.utils.toBN
        )} ${this.tokenSymbol}</p>`
      );
    }
    tDom.innerHTML = out.join("");
  }

  async generateQrCode() {
    const result = await QRCode.toCanvas(
      document.getElementById("qrcode"),
      this.fromAddress,
      { errorCorrectionLevel: "H" }
    );
    //console.log('generateQrCode: result:', result);
  }

  onInput() {
    if (this.valueDom.value !== "" && this.toAddressDom.value !== "") {
      this.submitDom.disabled = false;
    } else {
      this.submitDom.disabled = true;
    }
  }

  async onMint() {
    // TODO: Brand new user wallet would need gas funds
    const web3 = this.web3;
    const tenBn = web3.utils.toBN(10);
    const toAddress = this.toAddressDom.value;
    let value;
    try {
      value = strAndDecimalsToBn("1000", this.decimals, web3.utils.toBN);
    } catch (error) {
      appendError(error);
      return;
    }
    const valueHexStr = `${web3.utils.toHex(value)}`;
    let receipt;
    try {
      receipt = await this.token.methods
        .mint(this.fromAddress, valueHexStr)
        .send({ from: this.fromAddress, gas: 10 * 21 * 1000 });
      await this.updateValues();
    } catch (err) {
      appendError(err);
    }
  }

  async onSubmit() {
    const web3 = this.web3;
    const toAddress = this.toAddressDom.value;
    let value;
    try {
      value = strAndDecimalsToBn(
        this.valueDom.value,
        this.decimals,
        web3.utils.toBN
      );
    } catch (error) {
      appendError(error);
      return;
    }
    const valueHexStr = `${web3.utils.toHex(value)}`;
    let receipt;
    try {
      receipt = await this.token.methods
        .transfer(toAddress, valueHexStr)
        .send({ from: this.fromAddress, gas: 10 * 21 * 1000 });
      await this.updateValues();
    } catch (err) {
      // Add code here to handle:
      // 1. User rejects transaction via Wallet user interface
      // 2. User has insufficient ETH funds for paying gas for the transaction
      // 3. User has insufficient ERC-20 tokens for the amount they want to transfer
      appendError(err);
    }
  }

  onValueInput(event) {
    const s = event.target.value;
    console.log("onValueInput:", s, strIsValidFloat(s));
    if (!strIsValidFloat(s) && s !== "") {
      this.valueDom.value = this.oldValueStr;
    } else {
      this.oldValueStr = s;
    }
  }

  onToAddressScanClick() {
    // appendError(new Error('to-address-scan-click'));
    window.location.hash = "#to-address-scan";
  }

  pagePrivateKey(options: any) {
    const clearData = options["clearData"];
    let sk = window.localStorage.getItem(this.storageKeyForPrivateKey);
    if (!sk) {
      sk = "";
    }
    document.getElementById(
      "page-private-key"
    ).innerHTML = `Private Key: ${sk}`;
    document.getElementById("page-private-key").style.display = "block";
    if (clearData) {
      window.localStorage.clear();
    }
  }
}
