import '../App.css'
import type { ToolsProps } from '../types/ActiveTool';

const ToolsSideBar = ({activeTool, setActiveTool}: ToolsProps) => {

    

  return (
    <div className='tool-sidebar' >
      <button onClick={() => setActiveTool('cto')}>CTO</button>
      <button onClick={() => setActiveTool('ceo')}>CEO</button>
      <button onClick={() => setActiveTool('utilityPole')}>Poste</button>
      <p>Ferramenta ativa: {activeTool}</p>
    </div>
  )
}

export default ToolsSideBar;
