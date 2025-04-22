import {
  Account,
  Args,
  ArrayTypes,
  Mas,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import { getScByteCode } from './utils';

const account = await Account.fromEnv();
const provider = Web3Provider.buildnet(account);

console.log('Deploying contract...');

const multisigByteCode = getScByteCode('build', 'Multisig.wasm');

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

const owners: string[] = [
  'AU12Yd4kCcsizeeTEK9AZyBnuJNZ1cpp99XfCZgzS77ZKnwTFMpVE',
  'AU12dNgDQgXdLDuotLcwUhd4LNhUpoPZ9XXkQF2xxHrhEoUxuhTtU',
];

const required = 2;
const upgradeDelay = ONE_DAY;
const validationDelay = ONE_HOUR;

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
    coins: Mas.fromString('10'),
  },
);

console.log('Multisig deployed at:', multisig.address);

const events = await provider.getEvents({
  smartContractAddress: multisig.address,
});

for (const event of events) {
  console.log('Event:', event.data);
}
