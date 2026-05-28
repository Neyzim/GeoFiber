import type {Dispatch, SetStateAction } from "react"
import type { Tool } from "./Tool";


export type ToolsProps = ({
    activeTool: Tool;
    setActiveTool: Dispatch<SetStateAction<Tool>>
});