require("@nomicfoundation/hardhat-toolbox");
const { vars } = require("hardhat/config");

const INFURA_API_KEY = vars.get("INFURA_API_KEY");
const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");
const PK = vars.get("PK");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  mocha: {
    timeout: 1000000, // Timeout global pour les tests
  },
  solidity: {
    compilers: [{version: "0.8.27"},{version: "0.7.6"}],
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
      "viaIR": true,
    }
  },
  networks: {
    localhost:{
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      chainId: 11155111,
      accounts: [`0x${PK}`]
    },
    holesky: {
      url: `https://holesky.infura.io/v3/${INFURA_API_KEY}`,
      chainId: 17000,
      accounts: [`0x${PK}`]
    },
    basesepolia: {
      url: `https://base-sepolia.infura.io/v3/${INFURA_API_KEY}`,
      chainId: 84532,
      accounts: [`0x${PK}`]
    },
    hardhat: {
      // forking: {
      //   url: `https://base-sepolia.infura.io/v3/${INFURA_API_KEY}`,
      //   enabled: true,
      //   blocknumber: 18424438
      // }
      // forking: {
      //   url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      //   enabled: true,
      //   blocknumber: 7216877
      // }
      // forking: {
      //   url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      //   enabled: true,
      //   blocknumber: 21336919
      // }
      forking: {
        url: `https://base-mainnet.infura.io/v3/${INFURA_API_KEY}`,
        enabled: true,
        loggingEnabled: true,
        // blocknumber: 23607397
      }
    }
  },
  etherscan:{
    apiKey:{
      sepolia:ETHERSCAN_API_KEY,
      holesky:ETHERSCAN_API_KEY
    }
  }
};