const fs = require('fs');
const solc = require('solc');

const source = fs.readFileSync('./contract.sol', 'utf8');

const input = {
  language: 'Solidity',
  sources: { 'contract.sol': { content: source } },
  settings: { outputSelection: { '*': { '*': ['*'] } } }
};

// Load a specific compiler version
solc.loadRemoteVersion('v0.8.20+commit.a1b79de6', (err, solcSpecific) => {
  if (err) {
    console.error('Failed to load solc:', err);
    return;
  }

  const compiled = JSON.parse(solcSpecific.compile(JSON.stringify(input)));
  console.dir(compiled, { depth: null });

  const contract = compiled.contracts['contract.sol'].VMX;

  fs.writeFileSync('abi.json', JSON.stringify(contract.abi, null, 2));
  fs.writeFileSync('bytecode.json', JSON.stringify(contract.evm.bytecode.object));
  console.log("Contract compiled with Solidity 0.8.20");
});
