import { serializeOutPoint, serializeScript } from '@nervosnetwork/ckb-sdk-utils'
import { Service, TransferUpdate, TransferUpdateReq } from '../..'
import { FEE, getCotaTypeScript, getCotaCellDep } from '../../constants'
import { append0x } from '../../utils/hex'

export const generateTransferUpdateCotaTx = async (
  service: Service,
  cotaLock: CKBComponents.Script,
  withdrawalLock: CKBComponents.Script,
  transfers: TransferUpdate[],
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

  const cotaLockScript = serializeScript(cotaLock)
  const withdrawalLockScript = serializeScript(withdrawalLock)
  const withdrawalCotaCells = await service.collector.getCells(withdrawalLock, cotaType)
  if (!withdrawalCotaCells || withdrawalCotaCells.length === 0) {
    throw new Error("Withdrawal cota cell doesn't exist")
  }
  const withdrawalCotaCell = withdrawalCotaCells[0]

  const transferUpdateReq: TransferUpdateReq = {
    lockScript: cotaLockScript,
    withdrawalLockScript,
    transferOutPoint: append0x(serializeOutPoint(cotaCell.outPoint).slice(26)),
    transfers,
  }
  const { smtRootHash, transferUpdateSmtEntry } = await service.aggregator.generateTransferUpdateCotaSmt(
    transferUpdateReq,
  )
  const outputsData = [`0x01${smtRootHash}`]

  const withdrawalCellDep: CKBComponents.CellDep = { outPoint: withdrawalCotaCell.outPoint, depType: 'code' }
  const cellDeps = [withdrawalCellDep, getCotaCellDep(isMainnet)]
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
    i > 0 ? '0x' : { lock: '', inputType: `0x08${transferUpdateSmtEntry}`, outputType: '' },
  )
  return rawTx
}
