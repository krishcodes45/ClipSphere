import {QueryClient , QueryClientProvider} from '@tanstack/react-query'
import {Toaster} from 'sonner'
import ControlLayout from "./layouts/ControlLayer"
import './App.css'
import Widget from './components/Global/Widget'

const client = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={client}>
      <ControlLayout>
        <Widget/>
      </ControlLayout>
      <Toaster/>
    </QueryClientProvider>
  )
}

export default App
