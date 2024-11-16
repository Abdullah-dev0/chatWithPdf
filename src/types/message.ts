import { AppRouter } from '@/trpc'
import { inferRouterOutputs } from '@trpc/server'

type RouterOutput = inferRouterOutputs<AppRouter>

type Messages = RouterOutput['getFileMessages']['messages']

type OmitText = Omit<Messages[number], 'text'>

type ExtendedText = {
  text: string | JSX.Element
}

export type ExtendedMessage = OmitText & ExtendedText

export interface MessageLoadingStates {
  summarize?: boolean;
  paraphrase?: boolean;
  translate?: boolean;
}

export interface MessageUpdate {
  type: 'summarize' | 'paraphrase' | 'translate';
  content: string;
}
