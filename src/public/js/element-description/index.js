export const createDescriptionFromElement = (element) => {
    const getAttributes = (element) => {
        const attrs = {};
        Array.from(element.attributes || []).forEach(attr => {
            attrs[attr.name] = attr.value;
        });
        return attrs;
    };

    const getNodeKind = (element) => {
        if (element.tagName === "BUTTON") return "action";
        if (element.tagName === "SVG" || element.tagName === "PATH") return "icon";
        if (element.localName.includes("-")) return "component";
        return "layout";
    };

    const description = {
        type: "element",
        tag: element.localName,
        kind: getNodeKind(element),
        attributes: getAttributes(element),
        classList: Array.from(element.classList),
        children: [],
    };

    // 🔥 PRESERVE ORDER (TEXT + ELEMENTS)
    element.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent.trim()) {
                description.children.push({
                    type: "text",
                    content: node.textContent,
                });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            description.children.push(createDescriptionFromElement(node));
        }
    });

    return description;
};



export const createElementFromDescription = (
    description,
    isDraggable = false
) => {

    if (description.type === "text") {
        return document.createTextNode(description.content);
    }

    const SVG_TAGS = new Set(["svg", "path", "circle", "rect", "line", "g"]);

    const createElement = (tag) => {
        if (SVG_TAGS.has(tag)) {
            return document.createElementNS("http://www.w3.org/2000/svg", tag);
        }
        return document.createElement(tag);
    };

    const element = createElement(description.tag);

    /* classes */
    if (description.classList?.length) {
        element.classList.add(...description.classList);
    }

    /* attributes */
    Object.entries(description.attributes || {}).forEach(([k, v]) => {
        element.setAttribute(k, v);
    });

    /* draggable */
    if (isDraggable) {
        element.setAttribute("draggable", "true");
    }

    /* 🔥 PRESERVE ORDER */
    description.children?.forEach(child => {
        element.appendChild(
            createElementFromDescription(child, isDraggable)
        );
    });

    return element;
};