# Looping

![License](https://img.shields.io/badge/License-MIT-green)
![Languages](https://img.shields.io/badge/Languages-NextJS%20|%20Solidity-blue)

## Description

**Looping** is a DApp project built on a fork of the Base Mainnet network using Hardhat. It interacts with the [Morpho](https://morpho.org/) lending/borrowing protocol, allowing users to create and manage positions with or without leverage directly from the interface.

## Features

- Create a position on Morpho with or without leverage
- Manually manage your position
- Adjust leverage (increase or decrease)
- Add or remove collateral
- Borrow more, repay part of the loan
- Completely exit your position
- View your current position and projected position based on modified parameters

## Technologies Used

- **Frontend**:
  - [NextJS](https://nextjs.org/)
  - [RainbowKit](https://www.rainbowkit.com/)
  - [Viem](https://viem.sh/)
  - [ShadCN](https://shadcn.com/)
- **Backend**:
  - [Hardhat](https://hardhat.org/) (fork of the Base mainnet network)
- **Smart Contracts**:
  - `MorphoLeverage.sol` (main contract)
  - `MorphoBasics.sol` (secondary contract)

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine
- [Git](https://git-scm.com/) to clone the repository

### Steps

1. **Clone the repository**
    ```bash
    git clone https://github.com/Henri-Guillet/Looping.git
    ```
2. **Navigate to the project folder**
    ```bash
    cd Looping
    ```
3. **Install dependencies**
    ```bash
    npm install
    ```
4. **Configure environment variables**
    
    Set the environment variables using vars.set and vars.get.

5. **Start the project**
    ```bash
    npm run dev
    ```

## Usage

The application uses a local fork of the Base mainnet via Hardhat and is not available on testnet. After starting the project, navigate to `http://localhost:3000` in your browser to interact with the application.

## Smart Contracts

- **MorphoLeverage.sol**: Main contract that allows creating and managing leveraged positions on Morpho.
- **MorphoBasics.sol**: Secondary contract for viewing user position details.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Contact

- **Author**: [Henri Guillet](mailto:guillet.henri@gmail.com)
- **GitHub**: [Henri-Guillet](https://github.com/Henri-Guillet)

---

*Thank you for using Looping!*
