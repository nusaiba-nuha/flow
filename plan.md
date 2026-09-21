# **Objective**

A flow chart app with the necessary functionality to create, edit, and delete nodes.

# **Technology**

Technologies:

- Programming Language: JavaScript/ES6
- Framework/Libraries: Vite, Vue 3, Pinia, Vue Router, Vue Flow, Query
- Any UI frameworks or components
- Docker

# **Features**

## **Flow Chart: Canvas**

- Utilized the vue-flow library to display nodes accordingly from this payload.josn file.
- Add draggable functionality for each node, so users can move nodes across the canvas.

## **Create Node**

- Add a **Create New Node** button on the page for creating nodes with the following
  - Title - text field
  - Description - text field
  - Type of Node - Select field
    - Send Message (SendMessage)
    - Add Comments (addComment)
    - Business Hours (businessHours)

## **Node View in Canvas**

- Each node on the canvas should contain the following information
  - Icons
  - Title
  - Description (truncated)

## **Node Details: Drawer**

- Each node should have its own **Details** Drawer to display its properties and attachments.
  - The Details drawer should be accessible via **URL** containing the node ID.
  - The Details drawer should be able to be toggled by clicking on the node
  - The title and Description Fields should be \***_Editable_**.
  - Provide an option for the user to \***_Delete_** the node.
- Send Message
  - Display existing attachments as \***_Tile/Box Preview_**, and also allow the user to upload new attachments.
  - Display existing texts in an input text field, and allow the user to update/remove texts.
- Add Comments
  - Display existing comments in an input text field, and allow the user to update/remove comments
- Business Hours
  - Display existing business hours.
  - Utilize a Date Time Picker to update **business hours**
  - **(Note that success & failure nodes should not be accessible, purely for display in canvas)**

## **Query**

- Utilize **Query** for data fetching and mutation updates involving the **payload.json**
- Use the configuration below for the Query

```jsx
}

queryClientConfig: {

        defaultOptions: {

            queries: {

                refetchOnWindowFocus: false,

                networkMode: 'always',

                staleTime: Infinity,

                gcTime: 60 * 60 * 1000,

            },

        },

    },

};
```

## **Key Details to Keep In Mind**

- The transition between canvas and nodes should be buttery smooth
- All input fields should have necessary validations.
- Well-written code, optimized renders, and utility functions extracted in a separate file
- Ensure comprehensive unit tests on components and necessary logic.
- Use \***_Pinia_** and \***_Vue-Router_** for storing data and routing, respectively.
- Custom implementation will be my main focus (i.e., not using source code from any open-source project)
- Create a clear, well-documented README that should explain setup, design, decisions, and how to run the project

# **After all main functionalities are done, these are next**

- Undo/Redo for node moves and edits
- Keyboard accessibility for selecting nodes and opening the details drawer
- CI/CD pipeline for running the tests
