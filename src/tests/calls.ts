import {
  Args,
  ArrayTypes,
  bytesToSerializableObjectArray,
  Mas,
  MRC20,
  OperationStatus,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import { ONE_DAY, ONE_HOUR } from './utils';
import { getScByteCode } from '../utils';
import { Transaction } from './structs/transaction';

export async function deployMultisig(
  provider: Web3Provider,
  owners: string[],
  required: number,
  upgradeDelay: number = ONE_DAY,
  validationDelay: number = ONE_HOUR,
): Promise<SmartContract> {
  const multisigByteCode = getScByteCode('build', 'Multisig.wasm');

  const constructorArgs = new Args()
    .addArray(owners, ArrayTypes.STRING)
    .addI32(BigInt(required))
    .addU64(BigInt(upgradeDelay))
    .addU64(BigInt(validationDelay));

  const multisig = await SmartContract.deploy(
    provider,
    multisigByteCode,
    constructorArgs,
    {
      coins: Mas.fromString('2'),
    },
  );

  console.log('Multisig deployed at:', multisig.address);

  return multisig;
}

export async function transferToken(
  provider: Web3Provider,
  tokenAddress: string,
  to: string,
  amount: bigint,
) {}

export async function transferTokensFromMultisig(
  provider: Web3Provider,
  provider2: Web3Provider,
  tokenAddress: string,
  to: string,
  amount: bigint,
  multisigAddress: string,
) {
  const txArgs = new Args().addString(to).addU256(amount);

  const coinsToUse = Mas.fromString('0.01');

  const transaction = new Transaction(
    tokenAddress,
    'transfer',
    coinsToUse,
    txArgs.serialize(),
  );

  const multisigContractP1 = new SmartContract(provider, multisigAddress);
  const multisigContractP2 = new SmartContract(provider2, multisigAddress);

  await submitTransaction(multisigContractP1, transaction);

  // Get the transactiosn from the multisig contract
  const txs = await getTransactions(multisigContractP1);

  if (txs.length === 0) {
    throw new Error('No transactions found after submitting');
  }

  const lastTxId = txs.length - 1;
  const lastTx = txs[lastTxId];

  // Approve the last transaction with both accounts
  await approveTransaction(multisigContractP1, BigInt(lastTxId));
  await approveTransaction(multisigContractP2, BigInt(lastTxId));

  // Get approvals for the last transaction
  const approvals = await getApprovals(multisigContractP1, BigInt(lastTxId));

  if (approvals.length < 2) {
    throw new Error('Not enough approvals');
  }

  // Execute the transaction
  await executeTransaction(multisigContractP1, BigInt(lastTxId));

  // get the transactions from the multisig contract
  const txsAfter = await getTransactions(multisigContractP1);
}

export async function submitTransaction(
  multisigContract: SmartContract,
  transaction: Transaction,
) {
  console.log('Submitting transaction');
  const operation = await multisigContract.call(
    'submit',
    new Args().addSerializable(transaction).serialize(),
    {
      coins: Mas.fromString('0.05'),
    },
  );

  const status = await operation.waitSpeculativeExecution();

  if (status === OperationStatus.SpeculativeSuccess) {
    console.log('Transaction submitted successfully');
  } else {
    console.error('Transaction submission to multisig contract failed');
    throw new Error('Transaction submission  to multisig contract failed');
  }

  return true;
}

export async function getTransactions(
  contract: SmartContract,
  from?: bigint,
  to?: bigint,
): Promise<Transaction[]> {
  const args = new Args();

  if (from !== undefined) args.addU64(from);
  if (to !== undefined) args.addU64(to);

  const result = await contract.read('getTransactions', args.serialize());

  if (result.info.error || !result.value || result.value.length === 0) {
    throw new Error('Error getting transactions');
  }

  // const arrArgs = new Args(result.value);
  const txs = bytesToSerializableObjectArray(result.value, Transaction);

  // const txs = arrArgs.nextSerializableObjectArray<Transaction>(Transaction);

  console.log('transactions', txs);

  return txs;
}

export async function approveTransaction(
  contract: SmartContract,
  txId: bigint,
) {
  console.log(`Approving transaction with id ${txId}`);

  const operation = await contract.call(
    'approve',
    new Args().addU64(txId).serialize(),
    {
      coins: Mas.fromString('0.01'),
    },
  );

  const status = await operation.waitSpeculativeExecution();

  if (status === OperationStatus.SpeculativeSuccess) {
    console.log('Transaction approved successfully');
  } else {
    console.error('Transaction approval failed');
    throw new Error('Transaction approval failed');
  }

  return true;
}

export async function getApprovals(contract: SmartContract, txId: bigint) {
  const args = new Args().addU64(txId).serialize();

  const result = await contract.read('getApprovals', args);

  if (result.info.error || !result.value || result.value.length === 0) {
    console.warn(`No approvals found or an error occurred for txId ${txId}`);
    return [];
  }

  // const approvals = bytesToArray<string>(result.value, ArrayTypes.STRING);
  const arrArgs = new Args(result.value);
  const approvals = arrArgs.nextArray<string>(ArrayTypes.STRING);

  console.log(`Approvals for txId ${txId}:`, approvals);

  return approvals;
}

export async function executeTransaction(
  contract: SmartContract,
  txId: bigint,
) {
  console.log(`Executing transaction with id ${txId}`);
  // wait for 30 seconds to make sure the transaction is able to be executed
  await new Promise((resolve) => setTimeout(resolve, 30000));

  const operation = await contract.call(
    'execute',
    new Args().addU64(txId).serialize(),
    {
      coins: Mas.fromString('0.01'),
    },
  );

  const status = await operation.waitSpeculativeExecution();

  if (status === OperationStatus.SpeculativeSuccess) {
    console.log('Transaction executed successfully');
  } else {
    console.error('Transaction execution failed');
    throw new Error('Transaction execution failed');
  }

  return true;
}
