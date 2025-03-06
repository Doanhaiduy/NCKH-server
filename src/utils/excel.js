const ExcelJS = require('exceljs');
const axios = require('axios');

const createExcelReport = async (options) => {
    const { title, filename, sections, response, columnWidths, author } = options;

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Set default column widths or use provided widths
    worksheet.columns = columnWidths || [
        { width: 5 }, // A - margin
        { width: 25 }, // B
        { width: 40 }, // C
        { width: 15 }, // D
        { width: 25 }, // E
        { width: 30 }, // F
        { width: 30 }, // G
    ];

    let currentRow = 1;

    // Add title and date
    const titleRow = worksheet.addRow(['', title.toUpperCase()]);
    titleRow.font = { bold: true, size: 16 };
    titleRow.height = 24;

    // Dynamically merge cells based on the number of columns
    const lastCol = String.fromCharCode(65 + worksheet.columns.length - 1); // Calculate last column letter
    worksheet.mergeCells(`B${currentRow}:${lastCol}${currentRow}`);

    titleRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9EAD3' },
    };
    currentRow++;

    // Add date
    const dateRow = worksheet.addRow(['', 'Generated on:', new Date().toLocaleString()]);
    dateRow.font = { italic: true };
    worksheet.mergeCells(`C${currentRow}:${lastCol}${currentRow}`);
    currentRow++;

    // Empty row
    worksheet.addRow([]);
    currentRow++;

    // Process each section
    for (const section of sections) {
        currentRow = await processSection(worksheet, section, currentRow, lastCol, workbook);

        // Add empty row after each section
        worksheet.addRow([]);
        currentRow++;
    }

    // Add footer
    const footerRow = currentRow;
    worksheet.addRow(['', `Report generated from system on ${new Date().toLocaleString()} by ${author || 'Unknown'}`]);
    worksheet.mergeCells(`B${footerRow}:${lastCol}${footerRow}`);
    worksheet.getRow(footerRow).getCell(2).font = { italic: true, color: { argb: 'FF7F7F7F' } };

    // Response headers
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', `attachment; filename=${filename}_${Date.now()}.xlsx`);
    response.setHeader('Content-Type', 'charset=utf-8');

    await workbook.xlsx.write(response);
    response.end();
};

/**
 * Process a section of the report
 *
 * @param {Object} worksheet ExcelJS worksheet
 * @param {Object} section Section configuration
 * @param {number} startRow Starting row for this section
 * @param {string} lastCol Last column letter
 * @returns {number} Next row index after this section
 */
const processSection = async (worksheet, section, startRow, lastCol, workbook) => {
    let currentRow = startRow;

    switch (section.type) {
        case 'header':
            // Section Header
            const headerRow = worksheet.addRow(['', section.title.toUpperCase()]);
            headerRow.font = { bold: true, size: 14 };
            worksheet.mergeCells(`B${currentRow}:${lastCol}${currentRow}`);
            headerRow.getCell(2).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFCFD5EA' },
            };
            headerRow.height = 20;
            currentRow++;
            break;

        case 'info':
            // Information fields (key-value pairs)
            // Data format: [{key: 'Label1', value: 'Value1', key2: 'Label2', value2: 'Value2'}, ...]
            if (section.title) {
                const infoHeaderRow = worksheet.addRow(['', section.title.toUpperCase()]);
                infoHeaderRow.font = { bold: true, size: 14 };
                worksheet.mergeCells(`B${currentRow}:${lastCol}${currentRow}`);
                infoHeaderRow.getCell(2).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFCFD5EA' },
                };
                infoHeaderRow.height = 20;
                currentRow++;
            }

            for (const item of section.data) {
                const rowData = [''];
                if (item.key) rowData.push(item.key);
                if (item.value) rowData.push(item.value);
                if (item.key2) {
                    // Add some spacing
                    rowData.push('');
                    rowData.push(item.key2);
                }
                if (item.value2) rowData.push(item.value2);

                const infoRow = worksheet.addRow(rowData);

                if (item.key) infoRow.getCell(2).font = { bold: true };
                if (item.key2) infoRow.getCell(5).font = { bold: true };

                // Enable text wrapping for value fields
                if (item.value) {
                    infoRow.getCell(3).alignment = { wrapText: true, vertical: 'top' };
                }
                if (item.value2) {
                    infoRow.getCell(6).alignment = { wrapText: true, vertical: 'top' };
                }

                currentRow++;
            }
            break;

        case 'table':
            // Table with headers and rows
            // Data format: {headers: ['Col1', 'Col2', ...], rows: [[val1, val2, ...], ...], imageColumns: [{index: 5, width: 50, height: 50}]}
            if (section.title) {
                const tableHeaderRow = worksheet.addRow(['', section.title.toUpperCase()]);
                tableHeaderRow.font = { bold: true, size: 14 };
                worksheet.mergeCells(`B${currentRow}:${lastCol}${currentRow}`);
                tableHeaderRow.getCell(2).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFCFD5EA' },
                };
                tableHeaderRow.height = 20;
                currentRow++;
            }

            // Table headers
            const headers = ['', ...section.data.headers];
            const headerRow2 = worksheet.addRow(headers);

            // Style header cells
            for (let i = 2; i < headers.length + 1; i++) {
                headerRow2.getCell(i).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                headerRow2.getCell(i).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF4472C4' },
                };
                headerRow2.getCell(i).border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
                headerRow2.getCell(i).alignment = { horizontal: 'center', vertical: 'middle' };
            }
            headerRow2.height = 20;
            currentRow++;

            // Define image columns configuration (if provided)
            const imageColumns = section.data.imageColumns || [];

            // Table rows
            const tableStartRow = currentRow;
            for (let rowIndex = 0; rowIndex < section.data.rows.length; rowIndex++) {
                const rowData = section.data.rows[rowIndex];
                // Row height will be adjusted if there are images
                let rowHeight = 24; // Default row height

                // Create the row with text data
                const row = worksheet.addRow(['', ...rowData]);

                // Apply borders to cells and text wrapping
                for (let i = 2; i < headers.length + 1; i++) {
                    row.getCell(i).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' },
                    };
                    row.getCell(i).alignment = { wrapText: true, vertical: 'top' };
                }

                // Center first column (often an index)
                row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

                // Process image columns
                for (const imgCol of imageColumns) {
                    const colIndex = imgCol.index + 1;
                    const imageUrl = rowData[imgCol.index - 1];

                    row.getCell(colIndex).alignment = {
                        horizontal: 'center',
                        vertical: 'middle',
                    };

                    if (
                        !imageUrl ||
                        typeof imageUrl !== 'string' ||
                        (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:'))
                    ) {
                        continue;
                    }

                    try {
                        let imageBuffer;

                        if (imageUrl.startsWith('data:')) {
                            // Handle data URLs (base64 encoded images)
                            const base64Data = imageUrl.split(',')[1];
                            imageBuffer = Buffer.from(base64Data, 'base64');
                        } else {
                            // Fetch image from URL
                            const response = await axios
                                .get(imageUrl, { responseType: 'arraybuffer' })
                                .catch((error) => {
                                    console.error(`Failed to load image from URL: ${imageUrl}`, error);
                                    return null; // Return null if request fails
                                });

                            if (!response) continue; // Skip if image fetch failed
                            imageBuffer = Buffer.from(response.data);
                        }

                        // Add image to worksheet
                        const imageId = workbook.addImage({
                            buffer: imageBuffer,
                            extension: 'png', // Assume PNG, you might want to determine this from URL
                        });

                        const columnWidthTemp = worksheet.getColumn(colIndex).width || 20;
                        const rowHeightTemp = worksheet.getRow(currentRow).height || 20;

                        // Calculate cell position
                        const cellAddress = {
                            tl: { col: colIndex - 1, row: currentRow - 1 },
                            ext: { width: columnWidthTemp * 7, height: rowHeightTemp * 7 },
                            editAs: 'oneCell',
                        };
                        // Add image to the worksheet
                        worksheet.addImage(imageId, cellAddress);

                        // Clear the cell text (we're replacing with image)
                        row.getCell(colIndex).value = '';

                        // Adjust row height to fit image
                        rowHeight = Math.max(rowHeightTemp * 7, imgCol.height || 50);
                    } catch (error) {
                        // If image loading fails, leave the URL text
                        console.error(`Failed to load image from URL: ${imageUrl}`, error);
                        // Do not modify the cell content - keep the URL
                    }
                }
                // Set the row height if images were added
                if (imageColumns.length > 0) {
                    row.height = rowHeight;
                }

                currentRow++;
            }

            // Apply zebra striping
            for (let i = tableStartRow; i < currentRow; i++) {
                if ((i - tableStartRow) % 2 === 0) {
                    for (let j = 2; j < headers.length + 1; j++) {
                        worksheet.getRow(i).getCell(j).fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFF2F2F2' },
                        };
                    }
                }
            }
            break;

        case 'summary':
            // Summary section with totals or statistics
            // Data format: [{label: 'Label1', value: 'Value1', label2: 'Label2', value2: 'Value2'}, ...]
            if (section.title) {
                const summaryHeaderRow = worksheet.addRow(['', section.title.toUpperCase()]);
                summaryHeaderRow.font = { bold: true, size: 14 };
                worksheet.mergeCells(`B${currentRow}:${lastCol}${currentRow}`);
                summaryHeaderRow.getCell(2).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFCFD5EA' },
                };
                summaryHeaderRow.height = 20;
                currentRow++;
            }

            for (const item of section.data) {
                const rowData = ['', item.label, item.value];
                if (item.label2) {
                    rowData.push(''); // spacing
                    rowData.push(item.label2);
                    if (item.value2) rowData.push(item.value2);
                }

                const summaryRow = worksheet.addRow(rowData);
                summaryRow.getCell(2).font = { bold: true };
                if (item.label2) summaryRow.getCell(5).font = { bold: true };

                currentRow++;
            }
            break;

        case 'text':
            // Plain text or note section
            // Data format: string or array of strings
            const texts = Array.isArray(section.data) ? section.data : [section.data];

            for (const text of texts) {
                const textRow = worksheet.addRow(['', text]);
                worksheet.mergeCells(`B${currentRow}:${lastCol}${currentRow}`);
                currentRow++;
            }
            break;
    }

    return currentRow;
};

module.exports = { createExcelReport };
