let chatboxes = [];
let connections = [];
let chatboxIdCounter = 0;
let scale = 1;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let canvasOffset = { x: 0, y: 0 };
let isDragging = false;
let isResizing = false;
let selectedText = null;
let exploreButton = null;
let usedColors = new Set(); // Track used colors globally
let currentTempColor = null; // Track the current temporary highlight color

// Array of vibrant highlight colors
const highlightColors = [
  '#ffff99', // light yellow
  '#ffccff', // light pink
  '#ccffff', // light cyan
  '#ffcc99', // light orange
  '#ccffcc', // light green
  '#ffcccc', // light red
  '#ccccff', // light blue
  '#ffffcc', // pale yellow
  '#ffccee', // light rose
  '#ccffee', // mint
  '#ffeeff', // lavender
  '#eeffcc', // lime
  '#ffeedd', // peach
  '#ddeeff', // sky blue
  '#ffddee', // pink
  '#eeffdd', // light lime
  '#ddffee', // aqua
  '#ffeacc', // apricot
  '#ccddff', // periwinkle
  '#ffddcc'  // coral
];

const container = document.getElementById('canvas-container');
const svg = document.getElementById('connections-svg');
const backgroundDots = document.getElementById('background-dots');

// Get a unique color that hasn't been used yet
function getUniqueHighlightColor() {
  // Find colors not yet used
  const availableColors = highlightColors.filter(c => !usedColors.has(c));
  
  // If all colors used, reset and start over
  if (availableColors.length === 0) {
      usedColors.clear();
      return highlightColors[0];
  }
  
  // Pick a random available color
  const color = availableColors[Math.floor(Math.random() * availableColors.length)];
  return color;
}

// Hide API modal and initialize
document.getElementById('api-key-modal').classList.add('hidden');
initializeMainChatbox();

// Ensure main chatbox is centered on load
setTimeout(() => {
  centerMainChatbox();
}, 100);

function initializeMainChatbox() {
  const mainChatbox = createChatbox(null, '', true);
  chatboxes.push(mainChatbox);
  centerMainChatbox();
}

function createChatbox(parentId, highlightedText, isMain = false, highlightColor = null) {
  const id = chatboxIdCounter++;
  
  // Assign a unique color for this chatbox
  let chatboxColor;
  if (isMain) {
      chatboxColor = '#ffff99'; // Main chatbox always uses yellow
  } else {
      chatboxColor = getUniqueHighlightColor(); // Get unique color for child chatbox
      usedColors.add(chatboxColor); // Mark it as used
  }
  
  const chatbox = {
      id,
      element: null,
      parentId,
      highlightedText,
      highlightSpan: null, // Store reference to the highlight span
      highlightColor: highlightColor, // The color of the highlight that created this chatbox
      chatboxColor: chatboxColor, // The color this chatbox uses for its own highlights
      isMain,
      position: { x: 0, y: 0 },
      size: isMain ? { width: 360, height: 360 } : { width: 420, height: 420 },
      messages: [],
      isDragging: false,
      isResizing: false
  };

  const el = document.createElement('div');
  el.className = 'chatbox';
  el.style.width = chatbox.size.width + 'px';
  el.style.height = chatbox.size.height + 'px';
  
  // Calculate position to avoid overlap
  if (isMain) {
      // Position main chatbox at the actual center of the canvas
      chatbox.position = { 
          x: (window.innerWidth / 2) / scale - 250, 
          y: (window.innerHeight / 2) / scale - 250 
      };
  } else {
      chatbox.position = findNonOverlappingPosition(parentId);
  }
  
  el.style.left = chatbox.position.x + 'px';
  el.style.top = chatbox.position.y + 'px';

  // Apply highlight color to title if it exists
  const titleStyle = highlightedText && highlightColor ? `background: ${highlightColor};` : '';

  el.innerHTML = `
      <div class="chatbox-header">
          <div class="chatbox-title ${highlightedText ? '' : 'empty'}" style="${titleStyle}">${highlightedText || ''}</div>
          ${!isMain ? '<button class="delete-btn" onclick="deleteChatbox(' + id + ')">×</button>' : '<div></div>'}
      </div>
      <div class="messages-container" id="messages-${id}"></div>
      <div class="input-container">
          <input type="file" id="file-input-${id}" style="display: none;" accept="image/*,.pdf,.doc,.docx,.txt" multiple>
          <button class="attach-btn" onclick="openFileUpload(${id})" title="Attach files">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
          </button>
          <textarea class="input-field" id="input-${id}" placeholder="Message ChatGPT..." rows="1"></textarea>
          <button class="mic-btn" id="mic-${id}" onclick="toggleSpeechRecognition(${id})" title="Use microphone">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
          </button>
          <button class="send-btn" onclick="sendMessage(${id})" title="Send message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
          </button>
      </div>
      <div class="resize-handle se"></div>
  `;

  chatbox.element = el;
  container.appendChild(el);
  
  // Store attachments array for this chatbox
  chatbox.attachments = [];
  
  // Setup file input handler
  const fileInput = el.querySelector(`#file-input-${id}`);
  fileInput.addEventListener('change', (e) => handleFileSelection(id, e.target.files));

  // Make draggable
  const header = el.querySelector('.chatbox-header');
  header.addEventListener('mousedown', (e) => startDrag(e, chatbox));

  // Make resizable
  const resizeHandles = el.querySelectorAll('.resize-handle');
  resizeHandles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => startResize(e, chatbox, handle.classList));
  });

  // Text selection for explore feature
  const messagesContainer = el.querySelector('.messages-container');
  messagesContainer.addEventListener('mouseup', (e) => handleTextSelection(e, chatbox));
  messagesContainer.addEventListener('dblclick', (e) => handleTextSelection(e, chatbox));

  // Auto-resize textarea
  const input = el.querySelector('.input-field');
  input.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  // Enter to send
  input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage(id);
      }
  });

  // If has parent, create connection
  if (parentId !== null) {
      connections.push({ source: parentId, target: id });
      
      // Initialize with context
      if (highlightedText) {
          const parent = chatboxes.find(c => c.id === parentId);
          if (parent) {
              chatbox.messages = [...parent.messages];
          }
      }
      
      // Update connections immediately after adding to DOM
      setTimeout(() => updateConnections(), 0);
  }

  return chatbox;
}

function findNonOverlappingPosition(parentId) {
  const parent = chatboxes.find(c => c.id === parentId);
  if (!parent) return { x: 100, y: 100 };

  const spacing = 50;
  const chatboxSize = 520; // 500px + 20px spacing
  
  // Try multiple positions around the parent in different directions
  const directions = [
      { x: parent.position.x + parent.size.width + spacing, y: parent.position.y }, // Right
      { x: parent.position.x - chatboxSize, y: parent.position.y }, // Left
      { x: parent.position.x, y: parent.position.y + parent.size.height + spacing }, // Bottom
      { x: parent.position.x, y: parent.position.y - chatboxSize }, // Top
      { x: parent.position.x + parent.size.width + spacing, y: parent.position.y + spacing }, // Bottom-right
      { x: parent.position.x - chatboxSize, y: parent.position.y + spacing }, // Bottom-left
      { x: parent.position.x + parent.size.width + spacing, y: parent.position.y - spacing }, // Top-right
      { x: parent.position.x - chatboxSize, y: parent.position.y - spacing }, // Top-left
  ];
  
  // Shuffle directions for randomness
  for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
  }
  
  // Try each direction
  for (const pos of directions) {
      const overlapping = chatboxes.some(c => {
          if (c.id === parentId) return false;
          const dx = Math.abs(c.position.x - pos.x);
          const dy = Math.abs(c.position.y - pos.y);
          return dx < chatboxSize && dy < chatboxSize;
      });
      
      if (!overlapping) {
          return pos;
      }
  }
  
  // If all primary positions are taken, try random positions in a wider radius
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 600 + Math.random() * 400;
      const x = parent.position.x + Math.cos(angle) * distance;
      const y = parent.position.y + Math.sin(angle) * distance;
      
      const overlapping = chatboxes.some(c => {
          if (c.id === parentId) return false;
          const dx = Math.abs(c.position.x - x);
          const dy = Math.abs(c.position.y - y);
          return dx < chatboxSize && dy < chatboxSize;
      });
      
      if (!overlapping) {
          return { x, y };
      }
  }
  
  // Fallback: place it to the right with offset
  return { 
      x: parent.position.x + parent.size.width + spacing, 
      y: parent.position.y + (Math.random() * 200 - 100)
  };
}

function startDrag(e, chatbox) {
  if (e.target.closest('.delete-btn') || e.target.closest('button')) return;
  
  isDragging = true;
  chatbox.isDragging = true;
  chatbox.dragStart = {
      x: e.clientX / scale - chatbox.position.x,
      y: e.clientY / scale - chatbox.position.y
  };

  e.preventDefault();
}

function startResize(e, chatbox, classList) {
  isResizing = true;
  chatbox.isResizing = true;
  chatbox.resizeStart = {
      x: e.clientX,
      y: e.clientY,
      width: chatbox.size.width,
      height: chatbox.size.height
  };
  e.preventDefault();
  e.stopPropagation();
}

document.addEventListener('mousemove', (e) => {
  const activeChatbox = chatboxes.find(c => c.isDragging);
  if (activeChatbox) {
      activeChatbox.position.x = e.clientX / scale - activeChatbox.dragStart.x;
      activeChatbox.position.y = e.clientY / scale - activeChatbox.dragStart.y;
      activeChatbox.element.style.left = activeChatbox.position.x + 'px';
      activeChatbox.element.style.top = activeChatbox.position.y + 'px';
      requestAnimationFrame(() => updateConnections());
  }

  const resizingChatbox = chatboxes.find(c => c.isResizing);
  if (resizingChatbox) {
      const dx = e.clientX - resizingChatbox.resizeStart.x;
      const dy = e.clientY - resizingChatbox.resizeStart.y;
      
      // Resize both width and height simultaneously
      const newWidth = Math.max(250, Math.min(800, resizingChatbox.resizeStart.width + dx));
      const newHeight = Math.max(250, Math.min(800, resizingChatbox.resizeStart.height + dy));
      
      resizingChatbox.size.width = newWidth;
      resizingChatbox.size.height = newHeight;
      resizingChatbox.element.style.width = newWidth + 'px';
      resizingChatbox.element.style.height = newHeight + 'px';
      
      requestAnimationFrame(() => updateConnections());
  }

  // Panning
  if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      canvasOffset.x += dx;
      canvasOffset.y += dy;
      panStart = { x: e.clientX, y: e.clientY };
      updateCanvasTransform();
  }
});

document.addEventListener('mouseup', () => {
  chatboxes.forEach(c => {
      c.isDragging = false;
      c.isResizing = false;
  });
  isDragging = false;
  isResizing = false;
  isPanning = false;
  document.body.classList.remove('panning');
});

// Panning
document.addEventListener('mousedown', (e) => {
  if (e.target === document.body || e.target === container || e.target === svg) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
      document.body.classList.add('panning');
      e.preventDefault();
  }
});

// Zoom
document.addEventListener('wheel', (e) => {
  // If the cursor is over a chatbox (messages, textarea, etc), let the
  // chatbox scroll naturally instead of zooming the entire canvas.
  const target = e.target;
  if (target && target.closest && target.closest('.chatbox')) {
      return;
  }

  if (e.ctrlKey || e.metaKey) e.preventDefault();
  
  const delta = e.deltaY > 0 ? 0.95 : 1.05;
  const newScale = Math.max(0.25, Math.min(2, scale * delta));
  
  // Get mouse position relative to viewport
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  
  // Calculate the point under the mouse in the current scale
  const rect = container.getBoundingClientRect();
  const offsetX = (mouseX - rect.left) / scale;
  const offsetY = (mouseY - rect.top) / scale;
  
  // Update scale
  const oldScale = scale;
  scale = newScale;
  
  // Adjust canvas offset to keep the point under mouse stationary
  canvasOffset.x = mouseX - offsetX * scale;
  canvasOffset.y = mouseY - offsetY * scale;
  
  updateCanvasTransform();
  updateConnections();
  updateZoomIndicator();
  e.preventDefault();
}, { passive: false });

function updateCanvasTransform() {
  container.style.transform = `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${scale})`;
  container.style.transformOrigin = '0 0';
  
  // Update connections after transform
  requestAnimationFrame(() => updateConnections());
}

function centerMainChatbox() {
  const mainChatbox = chatboxes.find(c => c.isMain);
  if (mainChatbox) {
      const centerX = window.innerWidth / 2 - (mainChatbox.size.width * scale) / 2;
      const centerY = window.innerHeight / 2 - (mainChatbox.size.height * scale) / 2;
      
      canvasOffset.x = centerX - mainChatbox.position.x * scale;
      canvasOffset.y = centerY - mainChatbox.position.y * scale;
      
      updateCanvasTransform();
      updateConnections();
  }
}

// File upload functions
function openFileUpload(chatboxId) {
  const fileInput = document.getElementById(`file-input-${chatboxId}`);
  if (fileInput) {
      fileInput.click();
  }
}

function handleFileSelection(chatboxId, files) {
  const chatbox = chatboxes.find(c => c.id === chatboxId);
  if (!chatbox) return;

  // Add files to chatbox attachments
  Array.from(files).forEach(file => {
      const reader = new FileReader();
      
      if (file.type.startsWith('image/')) {
          reader.onload = (e) => {
              chatbox.attachments.push({
                  type: 'image',
                  name: file.name,
                  data: e.target.result,
                  file: file
              });
              updateAttachmentPreview(chatboxId);
          };
          reader.readAsDataURL(file);
      } else {
          chatbox.attachments.push({
              type: 'file',
              name: file.name,
              file: file
          });
          updateAttachmentPreview(chatboxId);
      }
  });
  
  // Clear the file input
  const fileInput = document.getElementById(`file-input-${chatboxId}`);
  if (fileInput) fileInput.value = '';
}

function updateAttachmentPreview(chatboxId) {
  const chatbox = chatboxes.find(c => c.id === chatboxId);
  if (!chatbox) return;

  const inputContainer = chatbox.element.querySelector('.input-container');
  
  // Remove existing preview
  let preview = chatbox.element.querySelector('.attachment-preview');
  if (preview) preview.remove();

  // Create new preview if there are attachments
  if (chatbox.attachments.length > 0) {
      preview = document.createElement('div');
      preview.className = 'attachment-preview';

      chatbox.attachments.forEach((attachment, index) => {
          const item = document.createElement('div');
          item.className = 'attachment-item';

          if (attachment.type === 'image') {
              const img = document.createElement('img');
              img.src = attachment.data;
              img.alt = attachment.name;
              item.appendChild(img);
          } else {
              const icon = document.createElement('div');
              icon.className = 'file-icon';
              const ext = attachment.name.split('.').pop().toUpperCase();
              icon.textContent = ext;
              item.appendChild(icon);
          }

          const fileName = document.createElement('span');
          fileName.className = 'file-name';
          fileName.textContent = attachment.name;
          item.appendChild(fileName);

          const removeBtn = document.createElement('button');
          removeBtn.className = 'remove-attachment';
          removeBtn.textContent = '×';
          removeBtn.onclick = () => removeAttachment(chatboxId, index);
          item.appendChild(removeBtn);

          preview.appendChild(item);
      });

      inputContainer.parentNode.insertBefore(preview, inputContainer);
  }
}

function removeAttachment(chatboxId, index) {
  const chatbox = chatboxes.find(c => c.id === chatboxId);
  if (!chatbox) return;

  chatbox.attachments.splice(index, 1);
  updateAttachmentPreview(chatboxId);
}

function updateZoomIndicator() {
  document.getElementById('zoom-level').textContent = Math.round(scale * 100);
}

function updateConnections() {
  svg.innerHTML = '';
  
  connections.forEach(conn => {
      const source = chatboxes.find(c => c.id === conn.source);
      const target = chatboxes.find(c => c.id === conn.target);
      
      if (source && target) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          
          // Calculate center points of each chatbox (in canvas coordinates)
          const x1 = source.position.x + source.size.width / 2;
          const y1 = source.position.y + source.size.height / 2;
          const x2 = target.position.x + target.size.width / 2;
          const y2 = target.position.y + target.size.height / 2;
          
          line.setAttribute('x1', x1);
          line.setAttribute('y1', y1);
          line.setAttribute('x2', x2);
          line.setAttribute('y2', y2);
          line.setAttribute('stroke', '#999999');
          line.setAttribute('stroke-width', '2');
          line.style.pointerEvents = 'none';
          
          svg.appendChild(line);
      }
  });
}

function deleteChatbox(id) {
  const chatbox = chatboxes.find(c => c.id === id);
  if (chatbox && !chatbox.isMain) {
      // Recursively delete all child chatboxes
      function deleteChildren(parentId) {
          const children = chatboxes.filter(c => c.parentId === parentId);
          children.forEach(child => {
              // First delete this child's children
              deleteChildren(child.id);
              
              // Remove the highlight from the parent chatbox and free the color
              if (child.highlightSpan && child.highlightSpan.parentNode) {
                  const parent = child.highlightSpan.parentNode;
                  const text = document.createTextNode(child.highlightSpan.textContent);
                  parent.replaceChild(text, child.highlightSpan);
                  parent.normalize();
              }
              
              // Free the chatbox color for reuse
              if (child.chatboxColor && child.chatboxColor !== '#ffff99') {
                  usedColors.delete(child.chatboxColor);
              }
              
              // Remove the element
              if (child.element) {
                  child.element.remove();
              }
              
              // Remove from chatboxes array
              chatboxes = chatboxes.filter(c => c.id !== child.id);
              
              // Remove connections
              connections = connections.filter(c => c.source !== child.id && c.target !== child.id);
          });
      }
      
      // Delete all children first
      deleteChildren(id);
      
      // Remove the highlight from the parent chatbox
      if (chatbox.highlightSpan && chatbox.highlightSpan.parentNode) {
          const parent = chatbox.highlightSpan.parentNode;
          const text = document.createTextNode(chatbox.highlightSpan.textContent);
          parent.replaceChild(text, chatbox.highlightSpan);
          parent.normalize();
      }
      
      // Free the chatbox color for reuse
      if (chatbox.chatboxColor && chatbox.chatboxColor !== '#ffff99') {
          usedColors.delete(chatbox.chatboxColor);
      }
      
      // Remove the chatbox itself
      chatbox.element.remove();
      chatboxes = chatboxes.filter(c => c.id !== id);
      connections = connections.filter(c => c.source !== id && c.target !== id);
      
      updateConnections();
      autoFitZoom();
  }
}

function handleTextSelection(e, chatbox) {
  const messageEl = e.target.closest ? e.target.closest('.message.assistant') : null;
  if (messageEl) {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText.length > 0) {
          // Check if selection overlaps with a permanent highlight
          const range = selection.getRangeAt(0);
          let overlapsPermanent = false;
          
          // Check if any permanent highlights exist in the selection
          const tempDiv = document.createElement('div');
          try {
              tempDiv.appendChild(range.cloneContents());
              if (tempDiv.querySelector('.highlight[data-permanent="true"]')) {
                  overlapsPermanent = true;
              }
          } catch (err) {
              // Ignore error
          }
          
          // Also check if the selection starts or ends inside a permanent highlight
          let node = range.startContainer;
          while (node && node !== messageEl) {
              if (node.nodeType === 1 && node.classList && node.classList.contains('highlight') && node.getAttribute('data-permanent') === 'true') {
                  overlapsPermanent = true;
                  break;
              }
              node = node.parentNode;
          }
          
          node = range.endContainer;
          while (node && node !== messageEl) {
              if (node.nodeType === 1 && node.classList && node.classList.contains('highlight') && node.getAttribute('data-permanent') === 'true') {
                  overlapsPermanent = true;
                  break;
              }
              node = node.parentNode;
          }
          
          // If overlaps with permanent highlight, cancel the selection
          if (overlapsPermanent) {
              selection.removeAllRanges();
              
              // Remove any temporary highlights
              document.querySelectorAll('.highlight:not([data-permanent="true"])').forEach(el => {
                  const parent = el.parentNode;
                  const text = document.createTextNode(el.textContent);
                  parent.replaceChild(text, el);
                  parent.normalize();
              });
              
              // Remove explore button
              if (exploreButton) {
                  exploreButton.remove();
                  exploreButton = null;
              }
              return;
          }
          
          // Remove previous temporary highlights (not permanent ones)
          document.querySelectorAll('.highlight:not([data-permanent="true"])').forEach(el => {
              const parent = el.parentNode;
              const text = document.createTextNode(el.textContent);
              parent.replaceChild(text, el);
              parent.normalize();
          });
          
          // Remove previous explore button
          if (exploreButton) {
              exploreButton.remove();
              exploreButton = null;
          }
          
          // Check if selection is within a single message element
          if (range.commonAncestorContainer === messageEl || 
              range.commonAncestorContainer.parentElement === messageEl ||
              messageEl.contains(range.commonAncestorContainer)) {
              
              // Use this chatbox's designated color
              const highlightColor = chatbox.chatboxColor;
              
              // Create highlight span (temporary - not permanent yet)
              const span = document.createElement('span');
              span.className = 'highlight';
              span.style.backgroundColor = highlightColor;
              span.setAttribute('data-color', highlightColor);
              
              try {
                  range.surroundContents(span);
              } catch (err) {
                  // If surroundContents fails (e.g., selection spans multiple nodes),
                  // extract contents and wrap them
                  const fragment = range.extractContents();
                  span.appendChild(fragment);
                  range.insertNode(span);
              }

              // Create explore button
              exploreButton = document.createElement('button');
              exploreButton.className = 'explore-btn';
              exploreButton.textContent = 'Explore';
              exploreButton.onclick = () => createExploreNode(chatbox.id, selectedText, span, highlightColor);
              // Use fixed positioning because we're placing relative to viewport rect.
              exploreButton.style.position = 'fixed';
              
              // Position the button relative to the highlighted text
              const rect = span.getBoundingClientRect();
              
              // Calculate position: right edge of highlight + 5px to the right, slightly below
              const btnLeft = rect.right + 5;
              const btnTop = rect.bottom + 5;
              
              exploreButton.style.left = btnLeft + 'px';
              exploreButton.style.top = btnTop + 'px';
              
              document.body.appendChild(exploreButton);
              
              selection.removeAllRanges();
          }
      }
  }
}

// Remove temporary highlights when clicking elsewhere
document.addEventListener('mousedown', (e) => {
  // Don't remove if clicking on the explore button
  if (e.target === exploreButton || (exploreButton && exploreButton.contains(e.target))) {
      return;
  }
  
  // Don't remove if clicking inside a message to select text
  if (e.target.closest && e.target.closest('.message.assistant')) {
      return;
  }
  
  // Remove temporary highlights
  document.querySelectorAll('.highlight:not([data-permanent="true"])').forEach(el => {
      const parent = el.parentNode;
      const text = document.createTextNode(el.textContent);
      parent.replaceChild(text, el);
      parent.normalize();
  });
  
  // Remove explore button
  if (exploreButton) {
      exploreButton.remove();
      exploreButton = null;
  }
});

function createExploreNode(parentId, text, highlightSpan, highlightColor) {
  const newChatbox = createChatbox(parentId, text, false, highlightColor);
  
  // Store reference to the highlight span
  newChatbox.highlightSpan = highlightSpan;
  
  // Keep the highlight permanent
  if (highlightSpan) {
      highlightSpan.setAttribute('data-permanent', 'true');
  }
  
  chatboxes.push(newChatbox);
  
  if (exploreButton) {
      exploreButton.remove();
      exploreButton = null;
  }

  // Focus the input in the newly created chatbox so the user can type immediately.
  setTimeout(() => {
      const input = document.getElementById(`input-${newChatbox.id}`);
      if (input) input.focus();
  }, 0);
}

function autoFitZoom() {
  if (chatboxes.length <= 1) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  chatboxes.forEach(c => {
      minX = Math.min(minX, c.position.x);
      minY = Math.min(minY, c.position.y);
      maxX = Math.max(maxX, c.position.x + c.size.width);
      maxY = Math.max(maxY, c.position.y + c.size.height);
  });

  const width = maxX - minX + 100;
  const height = maxY - minY + 100;
  
  const scaleX = window.innerWidth / width;
  const scaleY = window.innerHeight / height;
  
  scale = Math.min(scaleX, scaleY, 1);
  scale = Math.max(0.25, Math.min(2, scale));
  
  updateCanvasTransform();
  updateZoomIndicator();
}

async function sendMessage(chatboxId) {
  const chatbox = chatboxes.find(c => c.id === chatboxId);
  if (!chatbox) return;

  const input = document.getElementById(`input-${chatboxId}`);
  const message = input.value.trim();
  
  if (!message && chatbox.attachments.length === 0) return;

  const messagesContainer = document.getElementById(`messages-${chatboxId}`);
  
  // Add user message
  const userMsg = document.createElement('div');
  userMsg.className = 'message user';
  
  // Add attachments if any
  if (chatbox.attachments.length > 0) {
      const attachmentDisplay = document.createElement('div');
      attachmentDisplay.className = 'attachment-display';
      
      chatbox.attachments.forEach(attachment => {
          if (attachment.type === 'image') {
              const img = document.createElement('img');
              img.src = attachment.data;
              img.alt = attachment.name;
              img.onclick = () => window.open(attachment.data, '_blank');
              attachmentDisplay.appendChild(img);
          } else {
              const fileBadge = document.createElement('div');
              fileBadge.className = 'file-badge';
              fileBadge.innerHTML = `
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                      <polyline points="13 2 13 9 20 9"/>
                  </svg>
                  <span>${attachment.name}</span>
              `;
              attachmentDisplay.appendChild(fileBadge);
          }
      });
      
      userMsg.appendChild(attachmentDisplay);
  }
  
  // Add text message if any
  if (message) {
      const textNode = document.createTextNode(message);
      userMsg.appendChild(textNode);
  }
  
  messagesContainer.appendChild(userMsg);
  
  chatbox.messages.push({ 
      role: 'user', 
      content: message,
      attachments: chatbox.attachments.length > 0 ? [...chatbox.attachments] : null
  });
  
  // Clear attachments and preview
  chatbox.attachments = [];
  updateAttachmentPreview(chatboxId);
  
  input.value = '';
  input.style.height = 'auto';
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Show loading
  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'loading-indicator';
  loadingMsg.textContent = 'Thinking';
  messagesContainer.appendChild(loadingMsg);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  let assistantMessage = '';
  try {
      const apiMessages = chatbox.messages
          .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              // Send full chat history for this node (child nodes inherit parent history).
              messages: apiMessages,
              // If this is an “explore” node, include its highlighted topic as system context.
              context: chatbox.highlightedText || null
          })
      });

      if (!resp.ok) {
          const maybeJson = await resp.json().catch(() => null);
          const serverError = maybeJson?.error ? ` (${maybeJson.error})` : '';
          throw new Error(`Request failed: ${resp.status}${serverError}`);
      }

      const data = await resp.json();
      assistantMessage = (data && typeof data.text === 'string') ? data.text : '';
      if (!assistantMessage) assistantMessage = '[No response text returned]';
  } catch (err) {
      console.error(err);
      assistantMessage = 'Error: could not reach the AI server. Make sure `npm run dev` is running, your `.env` has `ANTHROPIC_API_KEY`, and try again.';
  }

  loadingMsg.remove();

  const assistantMsg = document.createElement('div');
  assistantMsg.className = 'message assistant';
  assistantMsg.textContent = assistantMessage;
  messagesContainer.appendChild(assistantMsg);
  
  chatbox.messages.push({ role: 'assistant', content: assistantMessage });
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

let recognition = null;
let currentRecordingChatbox = null;

function toggleSpeechRecognition(chatboxId) {
  const micBtn = document.getElementById(`mic-${chatboxId}`);
  
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
  }

  if (currentRecordingChatbox === chatboxId) {
      // Stop recording
      if (recognition) {
          recognition.stop();
          recognition = null;
      }
      micBtn.classList.remove('recording');
      currentRecordingChatbox = null;
  } else {
      // Start recording
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
          micBtn.classList.add('recording');
          currentRecordingChatbox = chatboxId;
      };

      recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          const input = document.getElementById(`input-${chatboxId}`);
          input.value = transcript;
          input.dispatchEvent(new Event('input'));
      };

      recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          micBtn.classList.remove('recording');
          currentRecordingChatbox = null;
      };

      recognition.onend = () => {
          micBtn.classList.remove('recording');
          currentRecordingChatbox = null;
      };

      recognition.start();
  }
}

// Initialize zoom indicator
updateZoomIndicator();