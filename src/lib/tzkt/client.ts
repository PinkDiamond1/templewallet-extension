import axios, { AxiosError } from 'axios';

import { isKnownChainId, TempleChainId } from 'lib/temple/types';
import {
  allInt32ParameterKeys,
  TzktGetOperationsParams,
  TzktGetRewardsParams,
  TzktGetRewardsResponse,
  TzktOperation,
  TzktRelatedContract,
  TzktTokenTransfer,
  TzktAccountTokenBalance
} from 'lib/tzkt/types';

export const TZKT_API_BASE_URLS = new Map([
  [TempleChainId.Mainnet, 'https://api.tzkt.io/v1'],
  [TempleChainId.Jakartanet, 'https://api.jakartanet.tzkt.io/v1'],
  [TempleChainId.Ghostnet, 'https://api.ghostnet.tzkt.io/v1'],
  [TempleChainId.Dcp, 'https://explorer.tlnt.net:8001/v1'],
  [TempleChainId.DcpTest, 'https://explorer.tlnt.net:8009/v1']
]);

const api = axios.create();
api.interceptors.response.use(
  res => res,
  err => {
    console.error(err);
    const { message } = (err as AxiosError).response?.data;
    throw new Error(`Failed when querying Tzkt API: ${message}`);
  }
);

export const getOperations = makeQuery<TzktGetOperationsParams, TzktOperation[]>(
  params => `/accounts/${params.address}/operations`,
  ({ address, type, quote, from, to, ...restParams }) => ({
    type: type?.join(','),
    quote: quote?.join(','),
    'timestamp.lt': to,
    'timestamp.ge': from,
    ...restParams
  })
);

export const getFa12Transfers = makeQuery<TzktGetOperationsParams, TzktOperation[]>(
  () => `/operations/transactions`,
  ({ address, from, to, ...restParams }) => ({
    'sender.ne': address,
    'target.ne': address,
    'initiator.ne': address,
    entrypoint: 'transfer',
    'parameter.to': address,
    'timestamp.lt': to,
    'timestamp.ge': from,
    ...restParams
  })
);

export const getFa2Transfers = makeQuery<TzktGetOperationsParams, TzktOperation[]>(
  () => `/operations/transactions`,
  ({ address, from, to, ...restParams }) => ({
    'sender.ne': address,
    'target.ne': address,
    'initiator.ne': address,
    entrypoint: 'transfer',
    'parameter.[*].txs.[*].to_': address,
    'timestamp.lt': to,
    'timestamp.ge': from,
    ...restParams
  })
);

export const getTokenBalances = makeQuery<TzktGetOperationsParams, TzktAccountTokenBalance[]>(
  () => `/tokens/balances`,
  ({ address, offset, limit, ...restParams }) => ({
    account: address,
    offset,
    limit,
    'sort.desc': 'balance',
    'token.metadata.artifactUri.null': true,
    ...restParams
  })
);

export const getNFTBalances = makeQuery<TzktGetOperationsParams, TzktAccountTokenBalance[]>(
  () => `/tokens/balances`,
  ({ address, offset, limit, ...restParams }) => ({
    account: address,
    offset,
    limit,
    'sort.desc': 'balance',
    'token.metadata.artifactUri.null': false,
    ...restParams
  })
);

export const getTokenTransfers = makeQuery<TzktGetOperationsParams, Array<TzktTokenTransfer>>(
  () => `/tokens/transfers`,
  ({ address, limit, type, ...restParams }) => ({
    'anyof.from.to': address,
    limit,
    type: type?.join(','),
    ...restParams
  })
);

export const getTokenTransfersCount = makeQuery<TzktGetOperationsParams, number>(
  () => `/tokens/transfers/count`,
  ({ address, limit, type, ...restParams }) => ({
    'anyof.from.to': address,
    limit,
    type: type?.join(','),
    ...restParams
  })
);
export const getTokenBalancesCount = makeQuery<TzktGetOperationsParams, number>(
  () => `/tokens/balances/count`,
  ({ address, ...restParams }) => ({
    account: address,
    'token.metadata.artifactUri.null': true,
    ...restParams
  })
);

export const getNFTBalancesCount = makeQuery<TzktGetOperationsParams, number>(
  () => `/tokens/balances/count`,
  ({ address, ...restParams }) => ({
    account: address,
    'token.metadata.artifactUri.null': false,
    ...restParams
  })
);

export const getAccount = makeQuery<TzktGetOperationsParams, any>(
  params => `/accounts/${params.address}`,
  ({ ...restParams }) => ({
    ...restParams
  })
);

type GetUserContractsParams = {
  account: string;
};

export const getOneUserContracts = makeQuery<GetUserContractsParams, TzktRelatedContract[]>(
  ({ account }) => `/accounts/${account}/contracts`,
  () => ({})
);

export const getDelegatorRewards = makeQuery<TzktGetRewardsParams, TzktGetRewardsResponse>(
  ({ address }) => `/rewards/delegators/${address}`,
  ({ cycle = {}, sort, quote, ...restParams }) => ({
    ...allInt32ParameterKeys.reduce(
      (cycleParams, key) => ({
        ...cycleParams,
        [`cycle.${key}`]: cycle[key]
      }),
      {}
    ),
    ...(sort ? { [`sort.${sort}`]: 'cycle' } : {}),
    quote: quote?.join(','),
    ...restParams
  })
);

function makeQuery<P extends Record<string, unknown>, R>(
  url: (params: P) => string,
  searchParams: (params: P) => Record<string, unknown>
) {
  return async (chainId: TempleChainId, params: P) => {
    const { data } = await api.get<R>(url(params), {
      baseURL: TZKT_API_BASE_URLS.get(chainId),
      params: searchParams(params)
    });

    return data;
  };
}

export const TZKT_FETCH_QUERY_SIZE = 20;

export const fetchTokenBalancesCount = async (chainId: string, address: string) => {
  if (!isKnownChainId(chainId) || !TZKT_API_BASE_URLS.has(chainId)) {
    return 0;
  }

  const count = await getTokenBalancesCount(chainId, {
    address
  });

  return count;
};

export const fetchTokenBalances = async (chainId: string, address: string, page = 0) => {
  if (!isKnownChainId(chainId) || !TZKT_API_BASE_URLS.has(chainId)) {
    return [];
  }

  const balances = await getTokenBalances(chainId, {
    address,
    limit: TZKT_FETCH_QUERY_SIZE,
    offset: page * TZKT_FETCH_QUERY_SIZE
  });

  return balances;
};

export const fetchNFTBalancesCount = async (chainId: string, address: string) => {
  if (!isKnownChainId(chainId) || !TZKT_API_BASE_URLS.has(chainId)) {
    return 0;
  }

  const count = await getNFTBalancesCount(chainId, {
    address
  });

  return count;
};

export const fetchNFTBalances = async (chainId: string, address: string, page = 0) => {
  if (!isKnownChainId(chainId) || !TZKT_API_BASE_URLS.has(chainId)) {
    return [];
  }

  const balances = await getNFTBalances(chainId, {
    address,
    limit: TZKT_FETCH_QUERY_SIZE,
    offset: page * TZKT_FETCH_QUERY_SIZE
  });

  return balances;
};
