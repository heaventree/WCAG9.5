import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { addFeedbackAsDebugItem } from '../data/debugData';
import { addFeedbackAsRoadmapFeature } from '../data/roadmapData';
import FeedbackMarker from './feedback/FeedbackMarker';
import { useFloatingTools } from '../contexts/FloatingToolsContext';

// Feedback item types
interface Position {
  x: number;
  y: number;
}

type FeedbackStatus = 'pending' | 'inProgress' | 'resolved';
type FeedbackCategory = 'debug' | 'roadmap';

interface FeedbackItem {
  id: string;
  position: Position;
  elementPath: string;
  comment: string;
  status: FeedbackStatus;
  createdAt: string;
  category: FeedbackCategory;
  page: string; // Store the page path where feedback was created
}

// Simple Feedback System Component
const SimpleFeedbackSystem: React.FC = () => {
  // Get current page location for page-specific feedback
  const location = useLocation();
  const currentPage = location.pathname;
  
  // Use the floating tools context
  const { activeTool, toggleTool } = useFloatingTools();
  
  // State for the feedback system
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FeedbackItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory>('debug');
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [currentComment, setCurrentComment] = useState('');
  
  // Compute isActive from the activeTool property
  const isActive = activeTool === 'feedback';
  
  // Reference to the widget element to avoid self-selection
  const widgetRef = useRef<HTMLDivElement>(null);
  
  // Load feedback items from localStorage on mount
  useEffect(() => {
    try {
      const savedItems = localStorage.getItem('feedbackItems');
      if (savedItems) {
        setFeedbackItems(JSON.parse(savedItems));
      }
    } catch (error) {
      console.error('Failed to load feedback items:', error);
    }
  }, []);
  
  // Filter items for the current page or update the data structure if needed
  useEffect(() => {
    // Ensure all items have a page property (for backward compatibility)
    const updatedItems = feedbackItems.map(item => {
      if (!item.page) {
        return { ...item, page: '/' };  // Default to homepage if no page info
      }
      return item;
    });
    
    if (JSON.stringify(updatedItems) !== JSON.stringify(feedbackItems)) {
      setFeedbackItems(updatedItems);
    }
    
    // Filter items to only show those for the current page
    const pageItems = updatedItems.filter(item => item.page === currentPage);
    setFilteredItems(pageItems);
  }, [feedbackItems, currentPage]);
  
  // Save feedback items to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('feedbackItems', JSON.stringify(feedbackItems));
      // Dispatch event for any subscribers
      const event = new CustomEvent('feedbackItemsUpdated', { detail: feedbackItems });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Failed to save feedback items:', error);
    }
  }, [feedbackItems]);
  
  // Handle document interaction when feedback tool is active
  useEffect(() => {
    if (!isActive) return;
    
    // Store original element states
    const originalStates = new Map<HTMLElement, {
      outline: string,
      outlineOffset: string,
      pointerEvents: string
    }>();
    

    // Save and disable buttons' normal behavior
    const disableInteractiveElements = () => {
      // Find all interactive elements
      const interactiveElements = document.querySelectorAll('button, a, input, select, [role="button"]');
      
      interactiveElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        
        // Skip our own widget elements
        if (widgetRef.current && widgetRef.current.contains(htmlEl)) return;
        
        // Store original state
        originalStates.set(htmlEl, {
          outline: htmlEl.style.outline,
          outlineOffset: htmlEl.style.outlineOffset,
          pointerEvents: htmlEl.style.pointerEvents
        });
        
        // Disable normal interactive behavior to allow highlighting and selection
        htmlEl.style.pointerEvents = 'none';
      });
    };
    
    // Call immediately to disable interactive elements
    disableInteractiveElements();
    
    // Handle element highlighting with a shared function
    const highlightElement = (element: HTMLElement) => {
      // Skip if it's the same element we're already hovering
      if (element === hoveredElement) return;
      
      // Skip if it's part of our own widget
      if (widgetRef.current && widgetRef.current.contains(element)) return;
      
      // Clear highlight from the previous element if any
      if (hoveredElement) {
        // Restore original outline (or empty string)
        const originalState = originalStates.get(hoveredElement);
        hoveredElement.style.outline = originalState?.outline || '';
        hoveredElement.style.outlineOffset = originalState?.outlineOffset || '';
      }
      
      // Apply highlight to the current element
      element.style.outline = '2px solid #3b82f6';
      element.style.outlineOffset = '2px';
      setHoveredElement(element);
    };
    
    // Handle mouse movement for element highlighting - using capture phase
    const handleMouseOver = (e: MouseEvent) => {
      highlightElement(e.target as HTMLElement);
    };
    
    // Handle mousemove for more comprehensive element detection
    const handleMouseMove = (e: MouseEvent) => {
      // Get all elements at the current pointer position
      const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
      
      // Skip if we're over our widget
      if (widgetRef.current && elementsAtPoint.some(el => widgetRef.current?.contains(el))) return;
      
      // Get the topmost element
      if (elementsAtPoint.length > 0) {
        highlightElement(elementsAtPoint[0] as HTMLElement);
      }
    };
    
    // Handle click to select an element and place a marker
    const handleClick = (e: MouseEvent) => {
      // Skip if clicking on our own widget
      if (widgetRef.current && widgetRef.current.contains(e.target as Node)) return;
      
      // Stop normal event behavior
      e.preventDefault();
      e.stopPropagation();
      
      // Get elements at click position to ensure we get the right one
      const elementsAtClick = document.elementsFromPoint(e.clientX, e.clientY);
      const clickedElement = elementsAtClick.length > 0 ? 
                           (elementsAtClick[0] as HTMLElement) : 
                           (e.target as HTMLElement);
      
      // Set the position and element for the feedback
      setSelectedPosition({ x: e.pageX, y: e.pageY });
      setSelectedElement(clickedElement);
      setShowCommentModal(true);
      
      // Clear all highlights
      document.body.querySelectorAll('*').forEach(el => {
        const htmlEl = el as HTMLElement;
        const originalState = originalStates.get(htmlEl) || { outline: '', outlineOffset: '' };
        htmlEl.style.outline = originalState.outline;
        htmlEl.style.outlineOffset = originalState.outlineOffset;
      });
      
      // Exit targeting mode but keep modal open
      toggleTool(null);
      
      // Restore pointer events on all elements
      originalStates.forEach((state, element) => {
        if (element) {
          element.style.pointerEvents = state.pointerEvents;
        }
      });
    };
    
    // Allow ESC to cancel
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleTool(null);
        
        // Restore all elements to their original state
        originalStates.forEach((state, element) => {
          if (element) {
            element.style.outline = state.outline;
            element.style.outlineOffset = state.outlineOffset;
            element.style.pointerEvents = state.pointerEvents;
          }
        });
      }
    };
    
    // Add a highlight overlay message to make it clear we're in targeting mode
    const overlay = document.createElement('div');
    overlay.id = 'feedback-targeting-overlay';
    overlay.style.position = 'fixed';
    overlay.style.bottom = '16px';
    overlay.style.left = '50%';
    overlay.style.transform = 'translateX(-50%)';
    overlay.style.background = 'rgba(0, 0, 0, 0.8)';
    overlay.style.color = 'white';
    overlay.style.padding = '8px 16px';
    overlay.style.borderRadius = '4px';
    overlay.style.zIndex = '9999';
    overlay.style.fontWeight = 'bold';
    overlay.style.fontSize = '14px';
    overlay.textContent = 'Click on any element to leave feedback (ESC to cancel)';
    document.body.appendChild(overlay);
    
    // Add all event listeners
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);
    
    // Change cursor to indicate clickable page
    document.body.style.cursor = 'crosshair';
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      
      // Reset cursor
      document.body.style.cursor = '';
      
      // Remove the overlay
      const existingOverlay = document.getElementById('feedback-targeting-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
      
      // Restore all elements to their original state
      originalStates.forEach((state, element) => {
        if (element) {
          element.style.outline = state.outline;
          element.style.outlineOffset = state.outlineOffset;
          element.style.pointerEvents = state.pointerEvents;
        }
      });
    };
  }, [isActive, hoveredElement, toggleTool]);
  
  // Generate a simple path for the element (captures the essentials but keeps it simple)
  const getElementPath = (element: HTMLElement): string => {
    if (!element) return '';
    if (element === document.body) return 'body';
    
    let selector = element.tagName.toLowerCase();
    
    // Add id if available
    if (element.id) {
      selector += `#${element.id}`;
      return selector;
    }
    
    // Add classes if available
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(/\\s+/).filter(c => c);
      if (classes.length) {
        selector += `.${classes.join('.')}`;
      }
    }
    
    // Add basic path info
    const parentElement = element.parentElement;
    if (parentElement && parentElement !== document.body) {
      return `${getElementPath(parentElement)} > ${selector}`;
    }
    
    return selector;
  };
  
  // Add a new feedback item
  const addFeedbackItem = () => {
    if (!selectedPosition || !selectedElement || !currentComment.trim()) return;
    
    const newItem: FeedbackItem = {
      id: `feedback-${Date.now()}`,
      position: selectedPosition,
      elementPath: getElementPath(selectedElement),
      comment: currentComment.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      category: selectedCategory,
      page: currentPage // Store current page information
    };
    
    // Add item to the global list
    setFeedbackItems(prev => [...prev, newItem]);
    
    // Create a title from element path (simplify it for readability)
    const elementTitle = getElementPath(selectedElement)
      .split('>')
      .pop()
      ?.trim() || 'Element';
      
    const title = `Feedback on ${elementTitle}`;
    const desc = currentComment.trim();
    
    // Add to appropriate admin panel based on category
    if (selectedCategory === 'debug') {
      // The category will be 'ui' or similar based on the element selected
      // For simplicity, we'll use 'ui' for divs, spans, etc. and 'accessibility' for forms, etc.
      let debugCategory = 'ui';
      const tag = selectedElement.tagName.toLowerCase();
      
      // Determine a more specific category based on the element
      if (['form', 'input', 'button', 'select', 'textarea'].includes(tag)) {
        debugCategory = 'accessibility';
      } else if (['table', 'tr', 'td', 'th'].includes(tag)) {
        debugCategory = 'data';
      } else if (['a', 'link', 'nav'].includes(tag)) {
        debugCategory = 'integration';
      }
      
      // Add to debug items
      try {
        console.log('Adding debug item:', title, desc, debugCategory);
        const itemId = addFeedbackAsDebugItem(
          title,
          desc,
          debugCategory as any,
          'medium'
        );
        console.log('Added debug item with ID:', itemId);
      } catch (error) {
        console.error('Failed to add debug item:', error);
      }
    } else if (selectedCategory === 'roadmap') {
      // Add to roadmap features
      // Determine a reasonable category based on the element
      let category: 'ui' | 'core' | 'reporting' | 'integration' | 'analytics' = 'ui';
      const tag = selectedElement.tagName.toLowerCase();
      
      // Determine a more specific category based on the element
      if (['table', 'canvas', 'svg'].includes(tag)) {
        category = 'reporting';
      } else if (['form', 'iframe'].includes(tag)) {
        category = 'integration';
      } else if (['script', 'head', 'meta'].includes(tag)) {
        category = 'core';
      }
      
      try {
        console.log('Adding roadmap feature:', title, desc, category);
        const featureId = addFeedbackAsRoadmapFeature(
          title,
          desc,
          category,
          3 // Medium priority
        );
        console.log('Added roadmap feature with ID:', featureId);
      } catch (error) {
        console.error('Failed to add roadmap feature:', error);
      }
    }
    
    // Also dispatch custom event for administrative use
    const eventData = {
      item: newItem,
      category: selectedCategory,
      elementPath: getElementPath(selectedElement)
    };
    
    // Create and dispatch a custom event that the admin components can listen for
    const event = new CustomEvent('feedbackItemCreated', { 
      detail: eventData
    });
    window.dispatchEvent(event);
    
    // Reset UI state
    setCurrentComment('');
    setShowCommentModal(false);
    setSelectedElement(null);
  };
  
  // Update the status of a feedback item (cycles through statuses)
  const toggleFeedbackStatus = (id: string) => {
    setFeedbackItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          const nextStatus = {
            pending: 'inProgress',
            inProgress: 'resolved',
            resolved: 'pending'
          }[item.status] as 'pending' | 'inProgress' | 'resolved';
          
          const updatedItem = { ...item, status: nextStatus };
          
          // Dispatch event for status change
          const event = new CustomEvent('feedbackUpdated', { detail: updatedItem });
          window.dispatchEvent(event);
          
          return updatedItem;
        }
        return item;
      })
    );
  };
  
  // Delete a feedback item (right-click)
  const deleteFeedbackItem = (id: string) => {
    setFeedbackItems(prevItems => prevItems.filter(item => item.id !== id));
  };
  
  // These helper functions are now in the FeedbackMarker component
  
  // Reset all feedback (for testing)
  const resetAllFeedback = () => {
    if (window.confirm('Are you sure you want to reset all feedback?')) {
      setFeedbackItems([]);
      localStorage.removeItem('feedbackItems');
    }
  };
  
  return (
    <div ref={widgetRef}>
      {/* Feedback Button */}
      <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
        {/* Category Switch */}
        <div className="mb-2 bg-white rounded-md shadow-sm border border-gray-200 p-1 flex text-xs">
          <button
            onClick={() => setSelectedCategory('debug')}
            className={`px-3 py-1 rounded-md transition-colors ${
              selectedCategory === 'debug' 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-100'
            }`}
          >
            Debug
          </button>
          <button
            onClick={() => setSelectedCategory('roadmap')}
            className={`px-3 py-1 rounded-md transition-colors ${
              selectedCategory === 'roadmap' 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-100'
            }`}
          >
            Roadmap
          </button>
        </div>
        
        <button
          onClick={() => {
            if (isActive) {
              toggleTool(null);
            } else {
              toggleTool('feedback');
            }
          }}
          className={`rounded-full h-12 w-12 shadow-lg flex items-center justify-center transition-colors ${
            isActive ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
          }`}
          title={isActive ? 'Cancel' : 'Click to add feedback'}
        >
          {isActive ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        </button>
        
        {/* Reset button (only visible if feedback exists) */}
        {feedbackItems.length > 0 && (
          <button
            onClick={resetAllFeedback}
            className="mt-2 text-xs bg-white p-1 rounded border border-gray-200 hover:bg-gray-50 shadow-sm"
            title="Reset all feedback markers"
          >
            Reset All
          </button>
        )}
      </div>
      
      {/* Feedback Markers - only show for current page */}
      {filteredItems.map(item => (
        <FeedbackMarker
          key={item.id}
          item={item}
          onStatusChange={toggleFeedbackStatus}
          onDelete={deleteFeedbackItem}
        />
      ))}
      
      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 w-80 max-w-[95vw] shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Add Feedback</h3>
              <button 
                onClick={() => {
                  setShowCommentModal(false);
                  setSelectedElement(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="text-xs bg-gray-100 p-2 rounded mb-4 overflow-hidden">
              <div className="font-medium mb-1">Element selected:</div>
              <div className="truncate opacity-60">
                {selectedElement ? getElementPath(selectedElement) : 'None'}
              </div>
            </div>
            
            <textarea
              value={currentComment}
              onChange={(e) => setCurrentComment(e.target.value)}
              placeholder="Enter your feedback here..."
              className="w-full border border-gray-300 rounded-md p-2 mb-4 h-24 text-sm"
              autoFocus
            />
            
            <div className="flex justify-end">
              <button
                onClick={addFeedbackItem}
                disabled={!currentComment.trim()}
                className={`px-4 py-2 rounded-md text-white ${
                  currentComment.trim() ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isActive && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-md shadow-lg text-sm z-50 border border-gray-200">
          Click anywhere on the page to add feedback
        </div>
      )}
    </div>
  );
};

export default SimpleFeedbackSystem;