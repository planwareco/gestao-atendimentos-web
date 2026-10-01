/** Tipagem do PaymentWidget (o pacote é publicado em JavaScript). */
declare module '@payment-system-mp/react-widget' {
  import type { ComponentType } from 'react';

  export type MetodoWidget = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO' | 'ACCOUNT_MONEY';

  export interface PagamentoWidget {
    id: string;
    status: string;
    method?: string;
    [chave: string]: unknown;
  }

  export interface PaymentWidgetProps {
    apiBaseUrl: string;
    publicKey: string;
    amount: number;
    description?: string;
    externalReference?: string;
    methods?: MetodoWidget[];
    payer?: { email?: string; firstName?: string; lastName?: string; document?: string };
    allowSaveCard?: boolean;
    persistDraft?: boolean;
    draftKey?: string;
    accentColor?: string;
    theme?: 'dark' | 'light';
    onPaymentCreated?: (p: PagamentoWidget) => void;
    onPaymentApproved?: (p: PagamentoWidget) => void;
    onError?: (e: unknown) => void;
  }

  export const PaymentWidget: ComponentType<PaymentWidgetProps>;
  export default PaymentWidget;
}
