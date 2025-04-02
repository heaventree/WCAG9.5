import { useState } from 'react';
import { ChevronDown, ChevronUp, PenTool as Tool, Maximize2, Minimize2, Info, FileText, CheckCircle } from 'lucide-react';
import type { AccessibilityIssue, WCAGInfo } from '../types';
import { Modal } from './Modal';
import { getWCAGInfo } from '../utils/wcagHelper';
import { AIRecommendations } from './AIRecommendations'; 
import { EmptyState } from './EmptyState';

type ModalView = 'info' | 'fix' | null;

interface IssuesListProps {
  issues: AccessibilityIssue[];
  type?: 'issues' | 'passes' | 'warnings';
}

export function IssuesList({ issues, type = 'issues' }: IssuesListProps) {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<AccessibilityIssue | null>(null);
  const [modalView, setModalView] = useState<ModalView>(null);

  const getImpactColor = (impact: AccessibilityIssue['impact']) => {
    if (type === 'passes') return 'bg-emerald-50 border-emerald-200';
    if (type === 'warnings') return 'bg-amber-50 border-amber-200';
    
    switch (impact) {
      case 'critical': return expandedIssue ? 'bg-red-50/80 border-red-400' : 'bg-red-50/80 border-red-300';
      case 'serious': return expandedIssue ? 'bg-orange-50/80 border-orange-400' : 'bg-orange-50/80 border-orange-300';
      case 'moderate': return expandedIssue ? 'bg-yellow-50/80 border-yellow-400' : 'bg-yellow-50/80 border-yellow-300';
      case 'minor': return expandedIssue ? 'bg-blue-50/80 border-blue-400' : 'bg-blue-50/80 border-blue-300';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getImpactTagColor = (impact: AccessibilityIssue['impact']) => {
    switch (impact) {
      case 'critical': return 'bg-red-600 text-white';
      case 'serious': return 'bg-orange-500 text-white';
      case 'moderate': return 'bg-yellow-500 text-white';
      case 'minor': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const toggleIssue = (id: string) => {
    setExpandedIssue(expandedIssue === id ? null : id);
  };

  const toggleAllIssues = (shouldExpand: boolean) => {
    setExpandedIssue(shouldExpand ? issues[0]?.id || null : null);
  };

  const openIssueDetails = (issue: AccessibilityIssue) => {
    setSelectedIssue(issue);
    setModalView('info');
  };

  const openIssueFix = (issue: AccessibilityIssue) => {
    setSelectedIssue(issue);
    setModalView('fix');
  };

  const closeModal = () => {
    setModalView(null);
    setSelectedIssue(null);
  };

  const getIssueWCAGInfo = (issue: AccessibilityIssue): WCAGInfo | undefined => {
    // Try rule ID first
    if (issue.id) {
      try {
        // First try the rule ID
        if (issue.id) {
          const ruleInfo = getWCAGInfo(issue.id);
          if (ruleInfo) return ruleInfo;
        }

        // Then try each WCAG criteria
        if (issue.wcagCriteria?.length > 0) {
          for (const criteria of issue.wcagCriteria) {
            const criteriaInfo = getWCAGInfo(criteria);
            if (criteriaInfo) return criteriaInfo;
          }
        }
      } catch (error) {
        console.error('Error getting WCAG info:', error);
      }
    }
    
    return undefined;
  };

  if (!issues || issues.length === 0) {
    return (
      <EmptyState
        title={`No ${type} Found`}
        description={type === 'issues' ? 'Great job! No accessibility issues were found.' : `No ${type} to display.`}
        icon={type === 'issues' ? <CheckCircle className="h-6 w-6 text-green-600" /> : undefined}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end gap-2">
        <button
          onClick={() => toggleAllIssues(true)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          aria-label="Expand all sections"
        >
          <Maximize2 className="w-4 h-4 mr-2" aria-hidden="true" />
          Open All
        </button>
        <button
          onClick={() => toggleAllIssues(false)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          aria-label="Collapse all sections"
        >
          <Minimize2 className="w-4 h-4 mr-2" aria-hidden="true" />
          Close All
        </button>
      </div>

      <div className="space-y-3">
        {issues.map((issue) => {
          const isExpanded = expandedIssue === issue.id;
          
          return (
            <div
              key={issue.id}
              className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                isExpanded ? `${getImpactColor(issue.impact)} bg-white shadow-md` : getImpactColor(issue.impact)
              }`}
            >
              <div className="flex justify-between items-start">
                <button 
                  className="flex-1 text-left flex items-center transition-colors duration-300"
                  onClick={() => toggleIssue(issue.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`issue-content-${issue.id}`}
                >
                  <div className="flex items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {issue.description}
                    </h3>
                    <div className="transform transition-transform duration-300">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 ml-2 text-gray-500" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-5 h-5 ml-2 text-gray-500" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                </button>
                {type !== 'passes' && (
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getImpactTagColor(issue.impact)} ml-4 transition-colors duration-300`}
                  >
                    {issue.impact}
                  </span>
                )}
              </div>
              
              <div
                id={`issue-content-${issue.id}`}
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isExpanded ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
                }`}
              > 
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700">Affected Elements:</h4>
                    <ul className="mt-2 space-y-1">
                      {issue.nodes.map((node, index) => (
                        <li key={index} className="text-sm text-gray-600 font-mono bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                          {node}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {issue.wcagCriteria && issue.wcagCriteria.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-700">WCAG Criteria:</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {issue.wcagCriteria.map((criteria, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-white rounded-full text-sm font-medium text-gray-700 border border-gray-200 shadow-sm"
                          >
                            {criteria}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* PDF-specific information */}
                  {issue.documentType === 'pdf' && issue.documentDetails && (
                    <div className="mt-4 bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-purple-600 mr-2" />
                        <h4 className="font-medium text-purple-800">PDF Document Details</h4>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {issue.documentDetails.filename && (
                          <div className="bg-white p-3 rounded-md">
                            <p className="text-sm font-medium text-gray-700">Filename</p>
                            <p className="text-sm text-gray-600">{issue.documentDetails.filename}</p>
                          </div>
                        )}
                        
                        {issue.documentDetails.pageCount !== undefined && (
                          <div className="bg-white p-3 rounded-md">
                            <p className="text-sm font-medium text-gray-700">Pages</p>
                            <p className="text-sm text-gray-600">{issue.documentDetails.pageCount}</p>
                          </div>
                        )}
                        
                        <div className="bg-white p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-700">Document Tags</p>
                          <p className="text-sm text-gray-600">
                            {issue.documentDetails.hasTags ? '✅ Present' : '❌ Missing'}
                          </p>
                        </div>
                        
                        <div className="bg-white p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-700">Document Language</p>
                          <p className="text-sm text-gray-600">
                            {issue.documentDetails.hasLanguage ? '✅ Defined' : '❌ Not defined'}
                          </p>
                        </div>
                        
                        <div className="bg-white p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-700">Structure</p>
                          <p className="text-sm text-gray-600">
                            {issue.documentDetails.hasStructure ? '✅ Proper' : '❌ Missing/Incorrect'}
                          </p>
                        </div>
                        
                        <div className="bg-white p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-700">Reading Order</p>
                          <p className="text-sm text-gray-600">
                            {issue.documentDetails.readingOrder ? '✅ Logical' : '❌ Problematic'}
                          </p>
                        </div>
                        
                        <div className="bg-white p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-700">Alternative Text</p>
                          <p className="text-sm text-gray-600">
                            {issue.documentDetails.hasAltText ? '✅ Present' : '❌ Missing'}
                          </p>
                        </div>
                        
                        {issue.documentDetails.formAccessibility !== undefined && (
                          <div className="bg-white p-3 rounded-md">
                            <p className="text-sm font-medium text-gray-700">Form Accessibility</p>
                            <p className="text-sm text-gray-600">
                              {issue.documentDetails.formAccessibility ? '✅ Accessible' : '❌ Not accessible'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {type !== 'passes' && (
                    <>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => openIssueFix(issue)}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm"
                          aria-label={`View fix for ${issue.description}`}
                        >
                          <Tool className="w-4 h-4 mr-2" aria-hidden="true" />
                          View Fix
                        </button>
                        <button
                          onClick={() => openIssueDetails(issue)}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200 shadow-sm"
                          aria-label={`Learn more about ${issue.description}`}
                        >
                          <Info className="w-4 h-4 mr-2" aria-hidden="true" />
                          Learn More
                        </button>
                      </div>
                      
                      <AIRecommendations issue={issue} />
                    </>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={modalView !== null}
        onClose={closeModal}
        title={modalView === 'fix' ? 'How to Fix This Issue' : 'Issue Information'}
      >
        {selectedIssue && (
          <div className="space-y-6">
            {modalView === 'info' ? (
              <>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Issue Description</h4>
                  <p className="text-gray-600">{selectedIssue.description}</p>
                </div>

                {selectedIssue.wcagCriteria && selectedIssue.wcagCriteria.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">WCAG Criteria</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedIssue.wcagCriteria.map((criteria, index) => (
                        <span
                          key={index}
                          className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium"
                        >
                          {criteria}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Affected Elements</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    {selectedIssue.nodes.map((node, index) => (
                      <pre key={index} className="text-sm text-gray-600 font-mono overflow-x-auto">
                        {node}
                      </pre>
                    ))}
                  </div>
                </div>
                
                {/* PDF document details in modal */}
                {selectedIssue.documentType === 'pdf' && selectedIssue.documentDetails && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">PDF Document Details</h4>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center mb-3">
                        <FileText className="w-5 h-5 text-purple-600 mr-2" />
                        {selectedIssue.documentDetails.filename && (
                          <span className="text-sm font-medium text-purple-800">
                            {selectedIssue.documentDetails.filename}
                            {selectedIssue.documentDetails.pageCount && 
                              ` (${selectedIssue.documentDetails.pageCount} pages)`
                            }
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-700">Document Tags</p>
                          <p className="text-sm text-gray-600">
                            {selectedIssue.documentDetails.hasTags ? '✅ Present' : '❌ Missing'}
                          </p>
                        </div>
                        
                        <div className="bg-white p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-700">Document Language</p>
                          <p className="text-sm text-gray-600">
                            {selectedIssue.documentDetails.hasLanguage ? '✅ Defined' : '❌ Not defined'}
                          </p>
                        </div>
                        
                        <div className="bg-white p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-700">Structure</p>
                          <p className="text-sm text-gray-600">
                            {selectedIssue.documentDetails.hasStructure ? '✅ Proper' : '❌ Missing/Incorrect'}
                          </p>
                        </div>
                        
                        <div className="bg-white p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-700">Reading Order</p>
                          <p className="text-sm text-gray-600">
                            {selectedIssue.documentDetails.readingOrder ? '✅ Logical' : '❌ Problematic'}
                          </p>
                        </div>
                        
                        <div className="bg-white p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-700">Alternative Text</p>
                          <p className="text-sm text-gray-600">
                            {selectedIssue.documentDetails.hasAltText ? '✅ Present' : '❌ Missing'}
                          </p>
                        </div>
                        
                        {selectedIssue.documentDetails.formAccessibility !== undefined && (
                          <div className="bg-white p-3 rounded-md">
                            <p className="text-sm font-medium text-gray-700">Form Accessibility</p>
                            <p className="text-sm text-gray-600">
                              {selectedIssue.documentDetails.formAccessibility ? '✅ Accessible' : '❌ Not accessible'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {(() => {
                  const wcagInfo = getIssueWCAGInfo(selectedIssue);
                  return (
                    <div>
                      <>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Success Criteria</h4>
                          <p className="text-gray-600 mb-6">
                            {wcagInfo?.successCriteria || 'Please refer to the WCAG documentation for this criterion.'}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Suggested Fix</h4>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            {selectedIssue.documentType === 'pdf' ? (
                              <div>
                                <h5 className="font-medium text-purple-800 mb-2">PDF Accessibility Improvement</h5>
                                <ul className="list-disc list-inside space-y-2 text-gray-600">
                                  {!selectedIssue.documentDetails?.hasStructure && (
                                    <li>
                                      <strong>Add document structure:</strong> Use Adobe Acrobat Pro or similar professional 
                                      tools to add proper document structure. Add tags to define headings, paragraphs, lists, 
                                      tables, and other content elements.
                                    </li>
                                  )}
                                  {!selectedIssue.documentDetails?.hasLanguage && (
                                    <li>
                                      <strong>Define document language:</strong> Set the document language in the document 
                                      properties to ensure proper pronunciation by screen readers.
                                    </li>
                                  )}
                                  {!selectedIssue.documentDetails?.hasAltText && (
                                    <li>
                                      <strong>Add alternative text:</strong> Provide descriptive alternative text for all 
                                      images, figures, and graphics in the document.
                                    </li>
                                  )}
                                  {!selectedIssue.documentDetails?.readingOrder && (
                                    <li>
                                      <strong>Fix reading order:</strong> Ensure the reading order matches the visual 
                                      order of content using the Order panel in Acrobat Pro.
                                    </li>
                                  )}
                                  {!selectedIssue.documentDetails?.hasTags && (
                                    <li>
                                      <strong>Add document tags:</strong> Make sure all content is properly tagged 
                                      to ensure screen readers can interpret the document structure.
                                    </li>
                                  )}
                                  {selectedIssue.documentDetails?.formAccessibility === false && (
                                    <li>
                                      <strong>Make forms accessible:</strong> Ensure all form fields have proper labels 
                                      and instructions that screen readers can interpret.
                                    </li>
                                  )}
                                </ul>
                                <p className="mt-4 text-purple-700">
                                  For comprehensive PDF remediation, we recommend using Adobe Acrobat Pro DC, CommonLook, 
                                  or other specialized PDF accessibility tools.
                                </p>
                              </div>
                            ) : (
                              <p className="text-gray-600 whitespace-pre-line">
                                {wcagInfo?.suggestedFix || selectedIssue.fixSuggestion || 
                                  'Please refer to the WCAG documentation for fixing this issue.'}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {wcagInfo?.codeExample && !selectedIssue.documentType && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 mb-2">Code Example</h4>
                            <pre className="bg-gray-800 text-white p-4 rounded-lg text-sm font-mono overflow-x-auto">
                              {wcagInfo.codeExample}
                            </pre>
                          </div>
                        )}
                        
                        {selectedIssue.documentType === 'pdf' && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 mb-2">Resources</h4>
                            <ul className="list-disc list-inside space-y-1 text-gray-600">
                              <li>
                                <a 
                                  href="https://www.adobe.com/accessibility/pdf/pdf-accessibility-overview.html" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  Adobe PDF Accessibility Overview
                                </a>
                              </li>
                              <li>
                                <a 
                                  href="https://www.w3.org/TR/WCAG-TECHS/pdf.html" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  W3C PDF Techniques for WCAG 2.0
                                </a>
                              </li>
                              <li>
                                <a 
                                  href="https://www.section508.gov/create/pdfs/" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  Section508.gov PDF Accessibility Guidance
                                </a>
                              </li>
                            </ul>
                          </div>
                        )}
                      </>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}