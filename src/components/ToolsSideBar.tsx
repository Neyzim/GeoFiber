import '../App.css'
import type { ToolsProps } from '../types/ActiveTool';

const ToolsSideBar = ({activeTool, setActiveTool}: ToolsProps) => {

    

  return (
    <div className='tool-sidebar' >
      <button onClick={() => setActiveTool('cto')}>Adicionar CTO</button>
      <p>Ferramenta ativa: {activeTool}</p>
    </div>
  )
}

export default ToolsSideBar;
