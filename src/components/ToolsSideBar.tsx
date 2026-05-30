  import '../App.css'
  import type { ToolsProps } from '../types/ActiveTool';

  const ToolsSideBar = ({activeTool, setActiveTool, finalizeCable}: ToolsProps) => {

      

    return (
      <div className='tool-sidebar' >
        {activeTool === 'cable' && <button onClick={finalizeCable}>Finalizar Cabo</button> }
        <button onClick={() => setActiveTool('cto')}>CTO</button>
        <button onClick={() => setActiveTool('ceo')}>CEO</button>
        <button onClick={() => setActiveTool('utilityPole')}>Poste</button>
        <button onClick={() => setActiveTool('cable')}>Cabo</button>
      
        <p>Ferramenta ativa: {activeTool}</p>
      </div>
    )
  }

  export default ToolsSideBar;
