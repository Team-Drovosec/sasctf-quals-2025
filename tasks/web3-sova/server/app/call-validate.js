const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3('http://anvil:8545');

// Load ABI, address, and get account
const abi = JSON.parse(fs.readFileSync('abi.json', 'utf8'));
const address = fs.readFileSync('contract-address.txt', 'utf8').trim();

const callValidate = async () => {
  const contract = new web3.eth.Contract(abi, address);

  const result = await contract.methods.validate(process.env.TARGET_KEY_ENV).call();

  const regs = result[0];
  const mem  = result[1];

  console.log("== Registers ==");
  
  for (let i = 0; i < regs.length; i++) {
      const val = BigInt(regs[i]);
      console.log(`reg[${i}] = 0x${val.toString(16)}`);
  }
  
  console.log("== Memory ==");

  for (let i = 0; i < mem.length; i++) {
    const indexHex = '0x' + i.toString(16).padStart(2, '0');
    const valueHex = '0x' + BigInt(mem[i]).toString(16).padStart(64, '0');
    console.log(`${indexHex}: ${valueHex}`);
  }  
};

callValidate();
