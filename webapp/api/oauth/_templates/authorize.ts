import { _Button } from 'api/_templates/button'
import { html } from 'hono/html'

interface AuthorizeProps {
  appName: string
  appOwnerName: string
  scopes: { name: string; description: string | null }[]
  oauthFields: {
    clientId: string
    redirectUri: string
    state?: string
    scope?: string
    token: string
    nowUnixMs: number
  }
}

export const _Authorize = ({
  appName,
  appOwnerName,
  scopes,
  oauthFields,
}: AuthorizeProps) => html`
  <div class="max-w-md space-y-8">
    <div>
      <h1 class="text-3xl font-bold mb-2 text-center">${appName}</h1>
      <span class="block text-lg font-normal text-gray-600 text-center">
        を承認しますか？
      </span>
    </div>
    <div class="space-y-6">
      <p class="text-md text-gray-800 text-center">
        承認すると ${appName} は以下の情報にアクセスできるようになります。
      </p>
      <div class="bg-gray-50 p-4 rounded-lg">
        <table class="border-collapse table-auto w-full text-sm">
          <tbody>
            ${scopes.map(
              data => html`
                <tr class="[&:not(:last-child)]:border-b-[1px] border-gray-200">
                  <td class="px-4 py-2 font-medium">${data.name}</td>
                  <td class="px-4 py-2 font-normal text-gray-500">
                    ${data.description}
                  </td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      </div>
      <form method="POST" action="/oauth/callback" class="space-y-4">
        <input type="hidden" name="client_id" value="${oauthFields.clientId}" />
        <input
          type="hidden"
          name="redirect_uri"
          value="${oauthFields.redirectUri}"
        />
        ${oauthFields.state
          ? html`<input
              type="hidden"
              name="state"
              value="${oauthFields.state}"
            />`
          : ''}
        ${oauthFields.scope
          ? html`<input
              type="hidden"
              name="scope"
              value="${oauthFields.scope}"
            />`
          : ''}
        <input type="hidden" name="time" value="${oauthFields.nowUnixMs}" />
        <input type="hidden" name="auth_token" value="${oauthFields.token}" />
        <div class="flex justify-around gap-4">
          ${_Button({
            text: '承認する',
            variant: 'primary',
            attributes: { type: 'submit', name: 'authorized', value: '1' },
          })}
          ${_Button({
            text: '拒否する',
            variant: 'secondary',
            attributes: { type: 'submit', name: 'authorized', value: '0' },
          })}
        </div>
        <p class="text-sm text-gray-600 mt-2 text-center">
          ${appOwnerName} によってリクエストされました。
        </p>
      </form>
    </div>
    <p class="text-sm text-gray-600 text-center">
      ${new URL(oauthFields.redirectUri).origin} へリダイレクトします。
      このアドレスが意図しているものか確認してください。
    </p>
  </div>
`
