import { generateToken, mockAuthResponse } from './mockResponses'
import { RequestClient } from '../../request/RequestClient'
import { refreshTokensForSasjs } from '../refreshTokensForSasjs'

const requestClient = new (<jest.Mock<RequestClient>>RequestClient)()

describe('refreshTokensForSasjs', () => {
  it('should attempt to refresh tokens', async () => {
    setupMocks()
    const refresh_token = generateToken(30)
    jest
      .spyOn(requestClient, 'post')
      .mockImplementation(() =>
        Promise.resolve({ result: mockAuthResponse, etag: '' })
      )

    await refreshTokensForSasjs(requestClient, refresh_token)

    expect(requestClient.post).toHaveBeenCalledWith(
      '/SASjsApi/auth/refresh',
      undefined,
      undefined,
      undefined,
      { Authorization: `Bearer ${refresh_token}` }
    )
  })

  it('should handle errors while refreshing tokens', async () => {
    setupMocks()

    const refresh_token = generateToken(30)
    const tokenError = 'unable to verify the first certificate'

    jest
      .spyOn(requestClient, 'post')
      .mockImplementation(() => Promise.reject(tokenError))

    const error = await refreshTokensForSasjs(
      requestClient,
      refresh_token
    ).catch((e: any) => e)

    expect(error).toEqual(`Error while refreshing tokens: ${tokenError}`)
  })
})

const setupMocks = () => {
  jest.restoreAllMocks()
  jest.mock('../../request/RequestClient')
}
