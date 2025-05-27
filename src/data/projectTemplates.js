const defaultContent = `#include <stdio.h>

int main() {
    printf("Hello, world!\\n");
    return 0;
}
`;

export const projectTemplates = [
  {
    name: "Hello World",
    description: "Basic C program with main function",
    files: [{ name: "main.c", content: defaultContent }],
  },
  {
    name: "Multi-file Project",
    description: "Project with header and source files",
    files: [
      {
        name: "main.c",
        content: `#include <stdio.h>\n#include "utils.h"\n\nint main() {\n    printf("Hello from main!\\n");\n    greet("World");\n    return 0;\n}\n`,
      },
      {
        name: "utils.h",
        content: `#ifndef UTILS_H\n#define UTILS_H\n\nvoid greet(const char* name);\n\n#endif\n`,
      },
      {
        name: "utils.c",
        content: `#include <stdio.h>\n#include "utils.h"\n\nvoid greet(const char* name) {\n    printf("Hello, %s!\\n", name);\n}\n`,
      },
    ],
  },
  {
    name: "Data Structures",
    description: "Project with common data structure examples",
    files: [
      {
        name: "main.c",
        content: `#include <stdio.h>\n#include "list.h"\n\nint main() {\n    // Your data structure code here\n    return 0;\n}\n`,
      },
      {
        name: "list.h",
        content: `#ifndef LIST_H\n#define LIST_H\n\ntypedef struct Node {\n    int data;\n    struct Node* next;\n} Node;\n\nNode* createNode(int data);\nvoid printList(Node* head);\n\n#endif\n`,
      },
      {
        name: "list.c",
        content: `#include <stdio.h>\n#include <stdlib.h>\n#include "list.h"\n\nNode* createNode(int data) {\n    Node* newNode = malloc(sizeof(Node));\n    newNode->data = data;\n    newNode->next = NULL;\n    return newNode;\n}\n\nvoid printList(Node* head) {\n    Node* current = head;\n    while (current != NULL) {\n        printf("%d -> ", current->data);\n        current = current->next;\n    }\n    printf("NULL\\n");\n}\n`,
      },
    ],
  },
  {
    name: "Empty Project",
    description: "Start with a blank project",
    files: [{ name: "untitled.c", content: "" }],
  },
];

export { defaultContent };
