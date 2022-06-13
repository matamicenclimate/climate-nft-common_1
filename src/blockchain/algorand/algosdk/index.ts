import Container from 'typedi'
import { BlockchainGateway } from '../..'
import BlockchainGatewayFactory from '../../BlockchainGatewayFactory'
import BlockchainGatewayProvider from '../../BlockchainGatewayProvider'
import { EncodeParameters, EncodeResult } from '../../features/EncodeFeature'
import { OptInParameters, OptInResult } from '../../features/OptInFeature'
import { PaymentParameters, PaymentResult } from '../../features/PaymentFeature'
import { AlgorandGateway, ALGORAND_GATEWAY_ID } from '../AlgorandGateway'
import algosdk from 'algosdk'
import {
  CreateAssetParameters,
  CreateAssetResult,
} from '../../features/CreateAssetFeature'
import {
  SignOperationParameters,
  SignOperationResult,
} from '../../features/SignOperationFeature'
import {
  CommitOperationParameters,
  CommitOperationResult,
} from '../../features/CommitOperationFeature'
import {
  ConfirmOperationParameters,
  ConfirmOperationResult,
} from '../../features/ConfirmOperationFeature'

class AlgosdkAlgorandGatewayFactory implements BlockchainGatewayFactory {
  provide(): BlockchainGateway {
    return new AlgosdkAlgorandGateway()
  }
}

class AlgosdkAlgorandGateway implements AlgorandGateway {
  async confirmOperation(
    params: ConfirmOperationParameters
  ): Promise<ConfirmOperationResult> {
    const confirmedTxn = await algosdk.waitForConfirmation(
      this.client,
      params.operation.id,
      10
    )
    return {
      operation: {
        commited: true,
        confirmed: true,
        signed: true,
        id: confirmedTxn.txId,
        data: confirmedTxn,
      },
    }
  }
  client!: algosdk.Algodv2
  async commitOperation(
    params: CommitOperationParameters
  ): Promise<CommitOperationResult> {
    if (!(params.operation.data?.blob instanceof Uint8Array)) {
      throw new Error(
        `Invalid operation: Attempting to commit an operation that is not compatible with the Algorand blockchain!`
      )
    }
    const { txId } = await this.client
      .sendRawTransaction([params.operation.data?.blob as Uint8Array])
      .do()
    return {
      operation: {
        confirmed: undefined,
        commited: true,
        signed: true,
        id: txId,
      },
    }
  }
  async signOperation(
    params: SignOperationParameters
  ): Promise<SignOperationResult> {
    throw new Error('Method not implemented.')
  }
  async createAsset(params: CreateAssetParameters): Promise<CreateAssetResult> {
    const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      from: params.owner,
      total: params.amount,
      decimals: params.fraction ?? 0,
      assetName: params.name,
      assetURL: params.url,
      assetMetadataHash: params.metadata?.checksum,
      note:
        params.metadata != null
          ? (await this.encodeObject({ object: params.metadata?.payload }))
              .payload
          : undefined,
      defaultFrozen: params.frozen ?? false,
      freeze: params.accounts?.['freeze'] ?? params.owner,
      manager: params.accounts?.['manager'] ?? params.owner,
      clawback: params.accounts?.['clawback'] ?? params.owner,
      reserve: params.accounts?.['reserve'] ?? params.owner,
      suggestedParams: await this.client.getTransactionParams().do(),
    })
    return {
      operation: {
        id: txn.txID(),
        commited: undefined,
        confirmed: undefined,
        signed: undefined,
        data: { txn },
      },
    }
  }
  async encodeObject(params: EncodeParameters): Promise<EncodeResult> {
    return {
      payload: algosdk.encodeObj(params.object),
    }
  }
  static register() {}
  get id(): typeof ALGORAND_GATEWAY_ID {
    return ALGORAND_GATEWAY_ID
  }
  async pay(params: PaymentParameters): Promise<PaymentResult> {
    throw new Error('Method not implemented.')
  }
  async optIn(params: OptInParameters): Promise<OptInResult> {
    throw new Error('Method not implemented.')
  }
}

Container.get(BlockchainGatewayProvider).register(
  new AlgosdkAlgorandGatewayFactory()
)
