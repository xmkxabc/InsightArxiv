// Enhanced Web Worker for JSON parsing with performance optimizations
let workerState = {
    isProcessing: false,
    isCancelled: false, // Flag to handle cancellation
    lastProgressTime: Date.now(),
    totalPapers: 0,
    processedCount: 0,
    startTime: 0,
    canvasContext: null, // For future OffscreenCanvas support
};

// Check for OffscreenCanvas support
const supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

// Self-monitoring: send heartbeat to detect stuck state
function sendHeartbeat() {
    if (workerState.isProcessing) {
        self.postMessage({
            type: 'heartbeat',
            timestamp: Date.now(),
            processed: workerState.processedCount,
            total: workerState.totalPapers,
            features: {
                offscreenCanvas: supportsOffscreenCanvas,
                imageDataProcessing: !!workerState.canvasContext
            }
        });
    }
}

// Start heartbeat monitoring
setInterval(sendHeartbeat, 5000); // Every 5 seconds

self.onmessage = async function(e) {
    // Handle cancellation requests
    if (e.data.type === 'cancel') {
        workerState.isCancelled = true;
        console.log('Worker processing cancelled by main thread.');
        return;
    }

    const { url, month, config = {}, asyncImageProcessing } = e.data;
    
    // Reset worker state for the new job
    workerState = {
        isProcessing: true,
        isCancelled: false,
        lastProgressTime: Date.now(),
        totalPapers: 0,
        processedCount: 0,
        startTime: Date.now(),
        canvasContext: null
    };
    
    // Initialize OffscreenCanvas if requested and supported
    if (asyncImageProcessing && supportsOffscreenCanvas) {
        try {
            const canvas = new OffscreenCanvas(256, 256);
            workerState.canvasContext = canvas.getContext('2d');
            console.log('OffscreenCanvas initialized for async image processing');
        } catch (error) {
            console.warn('Failed to initialize OffscreenCanvas:', error);
        }
    }
    
    // Send initial status with capabilities
    self.postMessage({
        type: 'started',
        month: month,
        timestamp: workerState.startTime,
        capabilities: {
            offscreenCanvas: supportsOffscreenCanvas,
            asyncImageProcessing: !!workerState.canvasContext,
            timeSlicing: config.enableTimeSlicing !== false
        }
    });
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            // More specific network error
            throw new Error(`Network error: HTTP status ${response.status}`);
        }

        // Report fetch completion
        self.postMessage({
            type: 'fetch_complete',
            month: month,
            contentLength: response.headers.get('content-length')
        });

        // Specific catch for JSON parsing errors
        const papers = await response.json().catch(parseError => {
            throw new Error(`Data format error: Failed to parse JSON. ${parseError.message}`);
        });

        // Check for cancellation after fetch/parse but before heavy processing
        if (workerState.isCancelled) return;

        workerState.totalPapers = papers.length;

        const dynamicBatchSize = calculateOptimalBatchSize(papers.length, config);

        self.postMessage({
            type: 'processing_start',
            month: month,
            totalPapers: papers.length,
            batchSize: dynamicBatchSize
        });

        const batches = [];
        for (let i = 0; i < papers.length; i += dynamicBatchSize) {
            batches.push(papers.slice(i, i + dynamicBatchSize));
        }

        // Await the promise-based batch processing
        await processBatchesWithTimeSlicing(batches, month, dynamicBatchSize);

    } catch (error) {
        workerState.isProcessing = false;
        self.postMessage({
            type: 'error',
            month: month,
            error: error.message,
            timestamp: Date.now()
        });
    }
};

// Calculate optimal batch size based on data volume and system capabilities
function calculateOptimalBatchSize(totalPapers, config) {
    const baseBatchSize = config.baseBatchSize || 1000;
    const maxBatchSize = config.maxBatchSize || 2000;
    const minBatchSize = config.minBatchSize || 100;
    
    // Adjust batch size based on total data size
    let optimalSize = baseBatchSize;
    
    if (totalPapers < 1000) {
        // Small dataset: use smaller batches for more frequent progress updates
        optimalSize = Math.max(minBatchSize, Math.floor(totalPapers / 10));
    } else if (totalPapers > 10000) {
        // Large dataset: use larger batches for efficiency
        optimalSize = Math.min(maxBatchSize, Math.floor(totalPapers / 20));
    } else {
        // Medium dataset: scale batch size proportionally
        optimalSize = Math.floor(baseBatchSize * (totalPapers / 5000));
    }
    
    // Adjust for OffscreenCanvas overhead if active
    if (workerState.canvasContext) {
        optimalSize = Math.round(optimalSize * 0.8); // Reduce by 20% for image processing overhead
    }
    
    return Math.max(minBatchSize, Math.min(maxBatchSize, optimalSize));
}

// Process batches with time slicing to avoid blocking and provide better progress updates
// Refactored to be promise-based to work with async/await
function processBatchesWithTimeSlicing(batches, month, batchSize) {
    return new Promise((resolve, reject) => {
        let currentBatchIndex = 0;

        function processNextBatch() {
            try {
                // Check for cancellation before processing the next batch
                if (workerState.isCancelled) {
                    console.log(`Batch processing for ${month} cancelled.`);
                    workerState.isProcessing = false;
                    resolve();
                    return;
                }

                if (currentBatchIndex >= batches.length) {
                    // All batches completed
                    workerState.isProcessing = false;
                    self.postMessage({
                        type: 'complete',
                        month: month,
                        totalPapers: workerState.totalPapers,
                        processingTime: Date.now() - workerState.startTime,
                        timestamp: Date.now(),
                        processedWithAsyncFeatures: !!workerState.canvasContext
                    });
                    resolve();
                    return;
                }

                const batch = batches[currentBatchIndex];
                const batchStartTime = Date.now();

                // Process batch with optional async image processing
                const processedBatch = processBatchWithAsyncFeatures(batch);

                // Update progress tracking
                workerState.processedCount += processedBatch.length;
                workerState.lastProgressTime = Date.now();

                // Send batch data with enhanced progress information
                const progressPercentage = Math.round(((currentBatchIndex + 1) / batches.length) * 100);
                const elapsedSeconds = (Date.now() - workerState.startTime) / 1000;
                const processingSpeed = elapsedSeconds > 0 ? workerState.processedCount / elapsedSeconds : 0;
                const estimatedTimeRemaining = processingSpeed > 0 ? (workerState.totalPapers - workerState.processedCount) / processingSpeed : Infinity;

                self.postMessage({
                    type: 'batch',
                    month: month,
                    papers: processedBatch,
                    progress: {
                        current: workerState.processedCount,
                        total: workerState.totalPapers,
                        percentage: progressPercentage,
                        batchIndex: currentBatchIndex + 1,
                        totalBatches: batches.length,
                        processingSpeed: Math.round(processingSpeed),
                        estimatedTimeRemaining: isFinite(estimatedTimeRemaining) ? Math.round(estimatedTimeRemaining) : -1,
                        batchProcessingTime: Date.now() - batchStartTime,
                        asyncFeaturesUsed: !!workerState.canvasContext
                    }
                });

                currentBatchIndex++;

                // Use setTimeout to create a time slice, allowing for heartbeat and other operations
                setTimeout(processNextBatch, 0);
            } catch (err) {
                workerState.isProcessing = false;
                reject(err);
            }
        }

        // Start processing
        processNextBatch();
    });
}

// Process batch with optional async features (placeholder for future enhancements)
function processBatchWithAsyncFeatures(batch) {
    // Future: Add OffscreenCanvas image processing here
    // For now, just return the batch as-is
    
    if (workerState.canvasContext) {
        // Placeholder for future image processing capabilities
        // This could include generating thumbnails, processing diagrams, etc.
        batch.forEach(paper => {
            if (paper.hasVisualContent) {
                // Future: Process visual content with OffscreenCanvas
                paper.asyncProcessingApplied = true;
            }
        });
    }
    
    return batch;
}

// Future: Async image processing functions
function processImageAsync(imageData, options = {}) {
    if (!workerState.canvasContext) {
        return imageData; // No processing available
    }
    
    try {
        // Placeholder for async image processing
        // Could include:
        // - Thumbnail generation
        // - Image optimization
        // - Visual content analysis
        // - Chart/diagram extraction
        
        const { width = 256, height = 256, quality = 0.8 } = options;
        
        // Future implementation would process the image here
        return {
            ...imageData,
            processed: true,
            timestamp: Date.now()
        };
    } catch (error) {
        console.warn('Async image processing failed:', error);
        return imageData;
    }
}

// Export capabilities for main thread
self.postMessage({
    type: 'capabilities',
    features: {
        offscreenCanvas: supportsOffscreenCanvas,
        timeSlicing: true,
        asyncImageProcessing: supportsOffscreenCanvas,
        dynamicBatching: true,
        progressMonitoring: true
    }
});
