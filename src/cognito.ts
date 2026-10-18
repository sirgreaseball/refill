// AWS Cognito Identity Provider integration for Gmail OTP verification
const COGNITO_ENDPOINT = 'https://cognito-idp.us-east-1.amazonaws.com/'
const CLIENT_ID = '6idmbpa85onbohp4gr3qc06v1e'

interface CognitoError {
  __type?: string
  message?: string
}

async function cognitoCall<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify(payload),
  })
  const data: CognitoError = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message ?? data.__type ?? 'Cognito request failed')
  }
  return data as T
}

export async function cognitoSignUp(email: string, password: string, name: string) {
  return cognitoCall<{ CodeDeliveryDetails: { Destination: string } }>('SignUp', {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'name', Value: name },
      { Name: 'email', Value: email },
    ],
  })
}

export async function cognitoConfirm(email: string, code: string) {
  return cognitoCall('ConfirmSignUp', {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code.trim(),
  })
}

export async function cognitoResend(email: string) {
  return cognitoCall('ResendConfirmationCode', {
    ClientId: CLIENT_ID,
    Username: email,
  })
}
