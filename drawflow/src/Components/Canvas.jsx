import { useEffect, useLayoutEffect, useState } from 'react';
import rough from 'roughjs';


const generator = rough.generator();

//CREATE ELEMENT FUNCTION
function createElemet(id, x1, y1, x2, y2, type, dashed) {
  var roughElement = "";

  switch (type) {
    case "line":
      roughElement = generator.line(x1, y1, x2, y2, dashed === true ? { strokeLineDash: [5], roughness: 0 } : { roughness: 0.5 })
      return { id, x1, y1, x2, y2, type, roughElement }

      break;
    case "rectangle":
      roughElement = generator.rectangle(x1, y1, x2 - x1, y2 - y1, dashed === true ? { strokeLineDash: [5], roughness: 0 } : { roughness: 0.5 })
      return { id, x1, y1, x2, y2, type, roughElement }

      break;
    case "circle":
      roughElement = generator.circle(x1 + 8, y1 - 10, x2 - x1, dashed === true ? { strokeLineDash: [5], roughness: 0 } : { roughness: 0, curveFitting: 1 })
      return { id, x1, y1, x2, y2, type, roughElement }

      break;
    case "ellipse":
      roughElement = generator.ellipse(x1, y1, x2 - x1, y2 - y1, dashed === true ? { strokeLineDash: [5], roughness: 0 } : { roughness: 0, curveFitting: 1 })
      return { id, x1, y1, x2, y2, type, roughElement }
      break;
    case "text":
      return { id, type, x1, y1, x2, y2, text: "" };
      break;

  }

}

const isInsideElement = (x, y, element) => {
  const { type, x1, x2, y1, y2 } = element;

  if (type === "line") {
    const a = { x: x1, y: y1 }
    const b = { x: x2, y: y2 }
    const c = { x, y };
    const offset = distance(a, b) - (distance(a, c) + distance(b, c));
    // console.log( Math.abs(offset)<10,Math.abs(offset))
    return Math.abs(offset) <= 5;

  }



  else {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }



};
const distance = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + (Math.pow(a.y - b.y, 2)));


function getElementAtposition(x, y, elements) {
  return elements.find(element => isInsideElement(x, y, element));

};

const useHistory = (initialState) => {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([initialState]);


  const setState = (action, overwrite = false) => {
    const newState = typeof action === "function" ? action(history[index]) : action;
    if (overwrite) {
      const historyCopy = [...history];
      historyCopy[index] = newState;
      setHistory(historyCopy);
    }
    else {
      const updatedState = [...history].slice(0, index + 1)
      setHistory([...updatedState, newState]);
      setIndex(prevState => prevState + 1);
    }
  };
  const undo = () => index > 0 && setIndex(prevState => prevState - 1)
  const redo = () => index < history.length - 1 && setIndex(prevState => prevState + 1)

  return [history[index], setState, undo, redo];
}

// CANVAS FUNCTION
export default function Canvas() {

  //STATES
  const [elements, setElements, undo, redo] = useHistory([]);
  const [action, setAction] = useState("none");
  const [tool, setTool] = useState("line");
  const [selectedElement, setSelectedElement] = useState(null);
  const [dashed, setDashed] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 159, y: 150 });

  //use effect
  useEffect(() => {

    const panFunction = (event) => {
      setPanOffset(prevState => ({
        x: prevState.x - event.deltaX,
        y: prevState.y - event.deltaY
      }));
    }

    document.addEventListener("wheel", panFunction);
    return () => {
      document.removeEventListener("wheel", panFunction);
    };
  });
  useEffect(() => {
    const undoRedoFunction = (event) => {
      switch (event.key) {
        case "s":
          setTool("select");
          break;
        case "l":
          setTool("line");
          break;
        case "r":
          setTool("rectangle");
          break;
        case "c":
          setTool("circle");
          break;
        case "e":
          setTool("ellipse");
          break;
        case "t":
          setTool("text");
          break;
        case "d":
          (dashed) ? setDashed(false) : setDashed(true);
          break;
        case "Delete":
          window.location.reload();
          break;
        default:
          console.log("some error!");

      }



      if ((event.metaKey || event.ctrlKey) && event.key == "z") {

        undo();
      } else if ((event.metaKey || event.ctrlKey) && event.key == "y") {
        redo();
      }

    };
    document.addEventListener("keydown", undoRedoFunction);
    return () => {
      document.removeEventListener("keydown", undoRedoFunction);
    };
  }, [undo, redo]);
  useLayoutEffect(() => {

    const canvas = document.getElementById('canvas');
    const roughCanvas = rough.canvas(canvas);
    const context = canvas.getContext('2d');

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(panOffset.x, panOffset.y);
   


    elements.forEach(element => {
      if (element.type === "text") {
        context.font = "24px fantasy";
        context.textBaseline = "top";
        context.fillText(element.text, element.x1, element.y1 + 9);

      } else {

        roughCanvas.draw(element.roughElement)
      }

    });
    context.restore();

  }, [elements,panOffset]);



  const updateElement = (id, x1, y1, x2, y2, type, options) => {
    const elementsCopy = [...elements];
    if (type === "text") {

      elementsCopy[id].text = options.text;

      setElements(elementsCopy);

    }
    else {

      const UpdatedElement = createElemet(id, x1, y1, x2, y2, type, dashed);

      elementsCopy[id] = UpdatedElement;
      setElements(elementsCopy, true);
    }

  };
  const getMouseCords = (event) => {
    const clientX = event.clientX - panOffset.x;
    const clientY = event.clientY - panOffset.y
    return { clientX, clientY };
  };

  //MOUSE DOWN
  const handleMouseDown = (event) => {

    if (action === "writing") return;
    const { clientX, clientY } = getMouseCords(event);

    if (tool === "select") {
      const element = getElementAtposition(clientX, clientY, elements);
      if (element) {
        const offsetX = clientX - element.x1;
        const offsetY = clientY - element.y1;
        setSelectedElement({ ...element, offsetX, offsetY });
        setAction("moving");
        setElements(prevState => prevState);

      };
    }
    else {
      const id = elements.length;
      const { clientX, clientY } = getMouseCords(event);
      const element = createElemet(id, clientX, clientY, clientX, clientY, tool, dashed);
      setElements(prevState => [...prevState, element]);
      setSelectedElement(element);
      setAction(tool === "text" ? "writing" : "drawing");
    }
  };

  // MOUSE MOVING
  const handleMouseMove = (event) => {

    const { clientX, clientY } = getMouseCords(event);
    if (action === "drawing") {
      const index = elements.length - 1;
      const { x1, y1 } = elements[index];
      updateElement(index, x1, y1, clientX, clientY, tool);
    }
    else if (action === "moving") {
      const { id, x1, y1, x2, y2, type, offsetX, offsetY } = selectedElement;
      const width = x2 - x1;
      const height = y2 - y1;
      const newX1 = clientX - offsetX;
      const newY1 = clientY - offsetY;
      const options = { text: selectedElement.text };
      updateElement(id, newX1, newY1, newX1 + width, newY1 + height, type, options);

    }

  };
  //MOUSE UP
  const handleMouseUp = () => {

    setAction("none");
    setSelectedElement(null);

  };

  const handleBlur = (event) => {
    const { id, x1, y1, type } = selectedElement;
    // setAction("none");
    // setSelectedElement(null);
    updateElement(id, x1, y1, null, null, type, { text: event.target.value })
  };


  return (

    <>
      <div className="drawing-tools" >
        <div className='select-case'>

          <input className="tool"
            type="radio"
            id="select"
            checked={tool === "select"} onChange={() => setTool("select")}
          />
          <label htmlFor="line"><b>[ S ]</b> Select</label>
        </div>

        <div className='select-case'>


          <input className="tool"
            type="radio"
            id="Line"
            checked={tool === "line"}
            onChange={() => setTool("line")}
          />

          <label htmlFor="line"><b>[ L ]</b> Line</label>
        </div>
        <div className='select-case'>

          <input className="tool"
            type="radio"
            id="rectangle"
            checked={tool === "rectangle"}
            onChange={() => setTool("rectangle")}
          /><label htmlFor="rectangle"><b>[ R ]</b> Rectangle</label>
        </div>
        <div className='select-case'>


          <input className="tool"
            type="radio"
            id="circle"
            checked={tool === "circle"}
            onChange={() => setTool("circle")}
          /><label htmlFor="circle"><b>[ C ]</b> Circle</label>
        </div>
        <div className='select-case'>

          <input className="tool"
            type="radio"
            id="ellipse"
            checked={tool === "ellipse"}
            onChange={() => setTool("ellipse")}
          /><label htmlFor="ellipse"><b>[ E ]</b> Ellipse</label>
        </div>
        <div className='select-case'>

          <input className="tool"
            type="radio"
            id="text"
            checked={tool === "text"}
            onChange={() => setTool("text")}
          />
          <label htmlFor="text"><b>[ T ]</b> Text</label>
        </div>

        <div className='select-case'>
          <input className="tool"
            type="checkbox"
            id="dashed"
            checked={dashed === true}
            onChange={() => setDashed(dashed === true ? false : true)}
          />
          <label htmlFor="dashed"><b>[ D ]</b>  Make Line Dashed</label>
        </div>

      </div>
      <div className='ur-btns' style={{ position: "fixed", bottom: 0 }}>
        <button onClick={undo}><b>[ ctrl+Z ]</b> Undo</button>
        <button onClick={redo}><b>[ctrl+Y]</b> Redo</button>
        <button type="submit" onClick={() => window.location.reload()}><b>[Delete]</b> Refresh Button</button>

      </div>
      {
        action === "writing" ?
          <textarea className='text-area'

            placeholder='tap to write'
            onBlur={handleBlur}
            style={{ position: "fixed", top: selectedElement.y1+panOffset.y, left: selectedElement.x1+panOffset.x }} />
          : null
      }
      <canvas id="canvas" width={window.innerWidth} height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={action === "moving" ? { cursor: "move" } : { cursor: "default" }}
      >
      </canvas>
    </>

  );
}