import { addressToScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import { Collector } from '../src/collector'
import { Aggregator } from '../src/aggregator'
import { generateDefineCotaTx } from '../src/service/cota'
import { Service } from '../src'
import { toSnakeCase } from '../src/utils'

const TEST_ADDRESS = 'ckt1qpth5hjexr3wehtzqpm97dzzucgemjv7sl05wnez7y72hqvuszeyyqvz2vhrf3xz0jr8dcmxlv059kmpx4tt5vcluapd4'

const run = async () => {
  const service: Service = {
    collector: new Collector({ ckbNodeUrl: 'http://localhost:8114', ckbIndexerUrl: 'http://localhost:8116' }),
    aggregator: new Aggregator({ registryUrl: 'http://localhost:3050', cotaUrl: 'http://localhost:3030' }),
  }
  const ckb = service.collector.getCkb()
  const defineLock = addressToScript(TEST_ADDRESS)
  let { rawTx, cotaId } = await generateDefineCotaTx(service, defineLock, 100, '0x00')
  console.log(`cotaId: ${cotaId}`)
  const flashsingerDep: CKBComponents.CellDep = {
    outPoint: {
      txHash: '0xb66776ff3244033fcd15312ae8b17d384c11bebbb923fce3bd896d89f4744d48',
      index: '0x0',
    },
    depType: 'depGroup',
  }
  rawTx.cellDeps.push(flashsingerDep)
  rawTx.witnesses = rawTx.witnesses.map(witness => (witness !== '0x' ? serializeWitnessArgs(witness) : '0x'))

  let signedTx = rawTx
  rawTx = toSnakeCase(rawTx)
  console.log(JSON.stringify(rawTx))

  // TODO: Add witnesses signed by flashsigner
  signedTx.witnesses = ['flashsigner-signed-witness']

  console.log(JSON.stringify(signedTx))
  let txHash = await ckb.rpc.sendTransaction(signedTx, 'passthrough')
  console.info(`Define cota nft tx has been sent with tx hash ${txHash}`)
}

run()
