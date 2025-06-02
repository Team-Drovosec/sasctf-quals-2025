const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3('http://anvil-backend:8546');

const abi = JSON.parse(fs.readFileSync('abi.json'));
const bytecode = JSON.parse(fs.readFileSync('bytecode.json'));

const deploy = async () => {
  const accounts = await web3.eth.getAccounts();
  const instance = new web3.eth.Contract(abi);
  const deployed = await instance.deploy({ data: bytecode })
    .send({ from: accounts[0], gas: 6000000 });

  fs.writeFileSync('contract-address.txt', deployed.options.address);
  console.log("Contract deployed at:", deployed.options.address);
};

deploy();
