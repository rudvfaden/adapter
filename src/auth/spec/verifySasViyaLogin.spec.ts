/**
 * @jest-environment jsdom
 */
import { verifySasViyaLogin } from '../verifySasViyaLogin'
import * as delayModule from '../../utils/delay'

describe('verifySasViyaLogin', () => {
  const serverUrl = 'http://test-server.com'

  beforeAll(() => {
    jest.mock('../../utils')
    jest
      .spyOn(delayModule, 'delay')
      .mockImplementation(() => Promise.resolve({}))
    document.cookie = encodeURIComponent('Current-User={"userId":"user-hash"}')
  })

  it('should return isLoggedIn true by checking state of popup', async () => {
    const popup = {
      window: {
        location: { href: serverUrl + `/SASLogon/home` },
        document: { body: { innerText: '<h3>You have signed in.</h3>' } }
      }
    } as unknown as Window

    await expect(verifySasViyaLogin(popup)).resolves.toEqual({
      isLoggedIn: true
    })
  })

  it('should return isLoggedIn false if user closed popup, already', async () => {
    const popup: Window = { closed: true } as unknown as Window

    await expect(verifySasViyaLogin(popup)).resolves.toEqual({
      isLoggedIn: false
    })
  })
})
