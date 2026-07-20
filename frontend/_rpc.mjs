import { createPublicClient, http } from 'viem';
const ADDR='0xb76F7df88695447b180f9CD1c7c32A9532752a11';
const abi=[{type:'event',name:'Minted',inputs:[{name:'user',type:'address',indexed:true},{name:'quantity',type:'uint256',indexed:false},{name:'totalPaid',type:'uint256',indexed:false},{name:'totalUsdt',type:'uint256',indexed:false},{name:'referralId',type:'string',indexed:false}]}];
const RPCS=['https://rpc.ankr.com/xdc_testnet','https://erpc.apothem.network','https://apothem.xdcscan.io/rpc','https://rpc.apothem.network','https://earpc.apothem.network'];
for (const rpc of RPCS){
  try {
    const c=createPublicClient({transport:http(rpc)});
    const latest=await c.getBlockNumber();
    let best=0n;
    for (const w of [1000n,50000n,500000n,4000000n]){
      try { await c.getContractEvents({address:ADDR,abi,eventName:'Minted',fromBlock:latest-w,toBlock:latest}); best=w; } catch(e){ break; }
    }
    // full scan test
    let full='?';
    try { const l=await c.getContractEvents({address:ADDR,abi,eventName:'Minted',fromBlock:0n}); full=`OK ${l.length} logs`; } catch(e){ full='FAIL'; }
    console.log(`${rpc} | latest=${latest} | maxWindow=${best} | fullScan=${full}`);
  } catch(e){ console.log(`${rpc} | UNREACHABLE ${(e.shortMessage||e.message||'').slice(0,50)}`); }
}
