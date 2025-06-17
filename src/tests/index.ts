import {
  Account,
  Args,
  Mas,
  MRC20,
  OperationStatus,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import * as dotenv from 'dotenv';
import { deployMultisig, transferTokensFromMultisig } from './calls';
import { ONE_DAY, ONE_HOUR, ONE_MINUTE, ONE_SECOND } from './utils';
import { assert } from 'console';

dotenv.config();

const account = await Account.fromEnv();
const provider = Web3Provider.buildnet(account);

const account2 = await Account.fromEnv('PRIVATE_KEY_TWO');

const provider2 = Web3Provider.buildnet(account2);

const profitAddr = 'AU12mxyWwCEkRRHnZBoBS4Y6GKR4PJeeLmnH6G8uRY89CrmwnEM9c';

const client = provider.client;

console.log('Account address:', account.address.toString());
console.log('Account2 address:', account2.address.toString());

const wmasTokenAddress =
  'AS12FW5Rs5YN2zdpEnqwj4iHUUPt9R4Eqjq2qtpJFNKW3mn33RuLU';

const owners: string[] = [
  'AU12Yd4kCcsizeeTEK9AZyBnuJNZ1cpp99XfCZgzS77ZKnwTFMpVE',
  'AU124nb2THtM4JHUDvjrFfVcnhvPmu2Xp5egNAgMdWqsRKc21w3pu',
];

const multisigContract = new SmartContract(
  provider,
  'AS12UEB5WqtbePKhav9vj82TLcCwHzEmTpgkDnskKRUB4BkxRxUSH',
);

// const multisigContract = await deployMultisig(
//   provider,
//   owners,
//   2,
//   ONE_MINUTE,
//   ONE_SECOND * 20, // 20 seconds
// );

await startTestTransferNativeCoin();

export async function stratTestTransferToken() {
  const tranfserAmount = Mas.fromString('1');

  const wmasToken = new MRC20(provider, wmasTokenAddress);

  const startBalance = await client.getBalance(multisigContract.address);

  console.log('Start balance of multisig contract:', startBalance.toString());

  // Transfer transferAmount to multisig contract from account 1
  const trOp = await wmasToken.transfer(
    multisigContract.address,
    tranfserAmount,
  );

  const trOpStatus = await trOp.waitSpeculativeExecution();

  if (trOpStatus === OperationStatus.SpeculativeSuccess) {
    console.log('Transfer operation executed successfully');
  } else {
    console.error('Transfer operation failed');
    throw new Error('Transfer operation failed');
  }

  // Get the balance of the multisig contract
  const balance = await client.getBalance(multisigContract.address);

  console.log('Balance of multisig contract:', balance.toString());

  // Expect the balance to be equal to transferAmount
  assert(
    balance - startBalance === tranfserAmount,
    'Balance is not equal to transfer amount',
  );

  // transfer the same amount from multisig contract to profitAddr
  const profitBalanceBef = await client.getBalance(profitAddr);

  console.log('Profit balance before transfer:', profitBalanceBef.toString());

  // Multisig transfers tokens to profitAddr
  await transferTokensFromMultisig(
    provider,
    provider2,
    wmasTokenAddress,
    profitAddr,
    tranfserAmount,
    multisigContract.address,
  );

  // get the balance of the profitAddr after the transfer
  const profitBalanceAft = await client.getBalance(profitAddr);

  console.log('Profit balance after transfer:', profitBalanceAft.toString());

  // check that the balance of the profitAddr is equal to the transferAmount
  assert(
    profitBalanceAft - profitBalanceBef === tranfserAmount,
    'Balance is not equal to transfer amount',
  );
}

export async function startTestTransferNativeCoin() {
  const tranfserAmount = Mas.fromString('1');

  const startBalance = await client.getBalance(multisigContract.address);

  console.log('Start balance of multisig contract:', startBalance.toString());

  // Transfer transferAmount to multisig contract from account 1
  const trOp = await provider.transfer(
    multisigContract.address,
    tranfserAmount,
  );

  const trOpStatus = await trOp.waitSpeculativeExecution();

  if (trOpStatus === OperationStatus.SpeculativeSuccess) {
    console.log('Transfer operation executed successfully');
  } else {
    console.error('Transfer operation failed');
    throw new Error('Transfer operation failed');
  }

  // Get the balance of the multisig contract
  const balance = await client.getBalance(multisigContract.address, false);

  console.log('Balance of multisig contract:', balance.toString());

  // Expect the balance to be equal to transferAmount
  assert(
    balance - startBalance === tranfserAmount,
    'Balance is not equal to transfer amount',
  );

  // transfer the same amount from multisig contract to profitAddr
  const profitBalanceBef = await client.getBalance(profitAddr, false);

  console.log('Profit balance before transfer:', profitBalanceBef.toString());

  // Multisig transfers tokens to profitAddr
  await transferTokensFromMultisig(
    provider,
    provider2,
    wmasTokenAddress,
    profitAddr,
    tranfserAmount,
    multisigContract.address,
    true,
  );

  // get the balance of the profitAddr after the transfer
  const profitBalanceAft = await client.getBalance(profitAddr, false);

  console.log('Profit balance after transfer:', profitBalanceAft.toString());

  // check that the balance of the profitAddr is equal to the transferAmount
  assert(
    profitBalanceAft - profitBalanceBef === tranfserAmount,
    'Balance is not equal to transfer amount',
  );
}
