import { serializeOutPoint, serializeScript } from '@nervosnetwork/ckb-sdk-utils'
import { MintReq, Service } from '../..'
import { FEE, getCotaTypeScript, getCotaCellDep } from '../../constants'
import { MintCotaInfo } from '../../types/service'
import { append0x } from '../../utils'

export const generateMintCotaTx = async (
  service: Service,
  cotaLock: CKBComponents.Script,
  mintCotaInfo: MintCotaInfo,
  fee = FEE,
  isMainnet = false,
) => {
  const cotaType = getCotaTypeScript(isMainnet)
  const cotaCells = await service.collector.getCells(cotaLock, cotaType)
  if (!cotaCells || cotaCells.length === 0) {
    throw new Error("Cota cell doesn't exist")
  }
  const cotaCell = cotaCells[0]
  const inputs = [
    {
      previousOutput: cotaCell.outPoint,
      since: '0x0',
    },
  ]

  const outputs = [cotaCell.output]
  outputs[0].capacity = `0x${(BigInt(outputs[0].capacity) - fee).toString(16)}`

  const mintReq: MintReq = {
    lockScript: serializeScript(cotaLock),
    cotaId: append0x(mintCotaInfo.cotaId),
    outPoint: append0x(serializeOutPoint(cotaCell.outPoint).slice(26)),
    withdrawals: mintCotaInfo.withdrawals,
  }

  const { smtRootHash, mintSmtEntry } = await service.aggregator.generateMintCotaSmt(mintReq)
  const cotaCellData = `0x01${smtRootHash}`

  const outputsData = [cotaCellData]
  const cellDeps = [getCotaCellDep(isMainnet)]

  const rawTx = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses: [],
  }
  rawTx.witnesses = rawTx.inputs.map((_, i) =>
    i > 0 ? '0x' : { lock: '', inputType: `0x02${mintSmtEntry}`, outputType: '' },
  )
  return rawTx
}
