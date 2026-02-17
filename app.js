let generatedFiles = [];
let editor = null;

function initMonaco() {
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        editor = monaco.editor.create(document.getElementById('editor'), {
            value: '',
            language: 'yaml',
            theme: 'vs',
            readOnly: true,
            automaticLayout: true
        });
    });
}

window.addEventListener('load', initMonaco);

function generateYAML() {
    const fileInput = document.getElementById('csvFile');
    const statusDiv = document.getElementById('status');
    const outputDiv = document.getElementById('output');
    
    if (!fileInput.files.length) {
        showStatus('Please select a CSV file', 'error');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const csv = e.target.result;
            const lines = csv.split('\n').filter(line => line.trim());
            generatedFiles = [];
            
            lines.forEach((line, index) => {
                const config = parseCSVLine(line);
                if (config.length > 0) {
                    const result = convertToYAML(config);
                    generatedFiles.push({ 
                        name: `${index + 1} ${result.documentName}.yml`, 
                        content: result.yaml 
                    });
                }
            });
            
            displayOutput(generatedFiles);
            document.getElementById('downloadAllBtn').style.display = generatedFiles.length > 0 ? 'block' : 'none';
            showStatus(`Successfully generated ${generatedFiles.length} YAML file(s)`, 'success');
        } catch (error) {
            showStatus(`Error: ${error.message}`, 'error');
        }
    };
    
    reader.readAsText(file);
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function convertToYAML(config) {
    let yaml = '';
    
    const jurisdiction = config[0];
    const documentName = config[2];
    yaml += `jurisdiction: ${jurisdiction}\n`;
    yaml += `documentCategory: ${toCamelCase(config[1])}\n`;
    yaml += `documentName: ${documentName}\n`;
    yaml += `subCategory: ${config[3]}\n`;
    if (config[4]) yaml += `formName: ${config[4]}\n`;
    if (config[5]) yaml += `documentType: ${config[5]}\n`;
    if (config[6]) yaml += `usageDescription: ${config[6]}\n`;
    
    // Land Title
    if (config[7] === 'Yes') {
        yaml += `# Object 1 - Land Title\n`;
        yaml += `landTitle:\n`;
        yaml += `  optional: ${!isMandatory(config[8])}\n`;
        yaml += `  multiples: ${booleanConverter(config[9])}\n`;
        yaml += `  landExtent: ${config[10].toLowerCase()}\n`;
    }
    
    // Dealing On Title
    if (config[11] === 'Yes') {
        yaml += `# Object Dealing On Title parent\n`;
        yaml += `dealingOnTitle:\n`;
        yaml += `  optional: ${!isMandatory(config[12])}\n`;
        yaml += `  multiples: ${booleanConverter(config[13])}\n`;
        yaml += `  dealingTypes:\n`;
        const dealingTypes = config[14].replace(/"/g, '');
        if (dealingTypes) {
            dealingTypes.split(';').forEach(type => {
                yaml += `    - ${type}\n`;
            });
        }
    }
    
    // Dealing On Title Interest Type
    if (config[15] === 'Yes') {
        yaml += `# Object 2 - Dealing On Title Interest Type\n`;
        yaml += `dealingOnTitleInterestType:\n`;
        yaml += `  optional: ${booleanConverter(config[16])}\n`;
    }
    
    // Dealing On Title Subject Interest In Land
    if (config[17] === 'Yes') {
        yaml += `# Object 3\n`;
        yaml += `dealingOnTitleSubjectInterestInLand:\n`;
        yaml += `  label: ${config[18]}\n`;
        yaml += `  optional: ${!booleanConverter(config[19])}\n`;
    }
    
    // Current Interest Party Tenancy
    if (config[20] === 'Yes') {
        yaml += `# Object 4 - Dealing on Title - Current Interest Party Category\n`;
        yaml += `dealingOnTitleCurrentInterestPartyTenancy:\n`;
        if (config[21]) yaml += `  label: ${config[21]}\n`;
        yaml += `  optional: ${!isMandatory(config[22])}\n`;
        yaml += `  sharesTransferable: ${booleanConverter(config[23])}\n`;
        yaml += renderSigningCertification(config[24]);
        if (config[25]) yaml += `  signingPartyRole: ${config[25]}\n`;
    }
    
    // Interest Party Tenancy
    if (config[26] === 'Yes') {
        yaml += `# Object 5 - Dealing on Title - Interest Party Tenancy\n`;
        yaml += `dealingOnTitleInterestPartyTenancy:\n`;
        if (config[27]) yaml += `  label: ${config[27]}\n`;
        yaml += `  optional: ${!isMandatory(config[28])}\n`;
        yaml += renderSigningCertification(config[29]);
        if (config[30]) yaml += `  signingPartyRole: ${config[30]}\n`;
    }
    
    // Current Proprietors Tenancy
    if (config[31] === 'Yes') {
        yaml += `# Object 6 - Current Proprietors Tenancy\n`;
        yaml += `currentProprietorsTenancy:\n`;
        if (config[32]) yaml += `  label: ${config[32]}\n`;
        yaml += `  optional: ${!isMandatory(config[33])}\n`;
        yaml += renderSigningCertification(config[34]);
        if (config[35]) yaml += `  signingPartyRole: ${config[35]}\n`;
    }
    
    // Proprietors Tenancy
    if (config[36] === 'Yes') {
        yaml += `# Object 7 - Proprietors Tenancy\n`;
        yaml += `proprietorsTenancy:\n`;
        if (config[37]) yaml += `  label: ${config[37]}\n`;
        yaml += `  optional: ${!isMandatory(config[38])}\n`;
        yaml += renderSigningCertification(config[39]);
        if (config[40]) yaml += `  signingPartyRole: ${config[40]}\n`;
    }
    
    // Applicants
    if (config[41] === 'Yes') {
        yaml += `# Object 8 - Applicants\n`;
        yaml += `applicants:\n`;
        if (config[42]) yaml += `  label: ${config[42]}\n`;
        yaml += `  optional: ${!isMandatory(config[43])}\n`;
        yaml += `  multiples: ${booleanConverter(config[44])}\n`;
        yaml += `  signingCertifications:\n`;
        const signingCerts = config[45].replace(/"/g, '').replace(/ /g, '');
        if (signingCerts) {
            signingCerts.split(',').forEach(cert => {
                yaml += `    - ${cert}\n`;
            });
        }
        if (config[46]) yaml += `  signingPartyRole: ${config[46]}\n`;
    }
    
    // Other Parties
    if (config[47] === 'Yes') {
        yaml += `# Object 9 - Other Parties\n`;
        yaml += `otherParties:\n`;
        if (config[48]) yaml += `  label: ${config[48]}\n`;
        yaml += `  optional: ${!isMandatory(config[49])}\n`;
        yaml += `  multiples: ${booleanConverter(config[50])}\n`;
    }
    
    // Monetary
    if (config[51] === 'Yes' || config[56] === 'Yes' || config[61] === 'Yes') {
        yaml += `# Object 10 - Monetary Object\n`;
        yaml += `monetary:\n`;
        
        if (config[51] === 'Yes') {
            yaml += `  - monetaryDetails:\n`;
            if (config[52]) yaml += `      label: ${config[52]}\n`;
            yaml += `      monetaryType: ${config[53]}\n`;
            yaml += `      optional: ${!isMandatory(config[54])}\n`;
            yaml += `      multiples: ${booleanConverter(config[55])}\n`;
        }
        
        if (config[56] === 'Yes') {
            yaml += `  - monetaryDetails:\n`;
            if (config[57]) yaml += `      label: ${config[57]}\n`;
            yaml += `      monetaryType: ${config[58]}\n`;
            yaml += `      optional: ${!isMandatory(config[59])}\n`;
            yaml += `      multiples: ${booleanConverter(config[60])}\n`;
        }
        
        if (config[61] === 'Yes') {
            yaml += `  - monetaryDetails:\n`;
            if (config[62]) yaml += `      label: ${config[62]}\n`;
            yaml += `      monetaryType: ${config[63]}\n`;
            yaml += `      optional: ${!isMandatory(config[64])}\n`;
            yaml += `      multiples: ${booleanConverter(config[65])}\n`;
        }
    }
    
    // Date
    if (config[66] === 'Yes' || config[71] === 'Yes' || config[76] === 'Yes') {
        yaml += `# Object 11 - Date Object\n`;
        yaml += `date:\n`;
        
        if (config[66] === 'Yes') {
            yaml += `  - dateDetails:\n`;
            yaml += `      dateType: ${config[67]}\n`;
            yaml += `      dateFormat: ${config[68]}\n`;
            yaml += `      optional: ${!isMandatory(config[69])}\n`;
            yaml += `      multiples: ${booleanConverter(config[70])}\n`;
        }
        
        if (config[71] === 'Yes') {
            yaml += `  - dateDetails:\n`;
            yaml += `      dateType: ${config[72]}\n`;
            yaml += `      dateFormat: ${config[73]}\n`;
            yaml += `      optional: ${!isMandatory(config[74])}\n`;
            yaml += `      multiples: ${booleanConverter(config[75])}\n`;
        }
        
        if (config[76] === 'Yes') {
            yaml += `  - dateDetails:\n`;
            yaml += `      dateType: ${config[77]}\n`;
            yaml += `      dateFormat: ${config[78]}\n`;
            yaml += `      optional: ${!isMandatory(config[79])}\n`;
            yaml += `      multiples: ${booleanConverter(config[80])}\n`;
        }
    }
    
    // Other Data
    if (config[81] === 'Yes' || config[85] === 'Yes' || config[89] === 'Yes' || config[93] === 'Yes') {
        yaml += `# Object 12 - Other Data object\n`;
        yaml += `otherData:\n`;
        
        if (config[81] === 'Yes') {
            yaml += `  - otherDataDetails:\n`;
            yaml += `      additionalDetailType: ${config[82]}\n`;
            yaml += `      type: ${config[83]}\n`;
            yaml += `      optional: ${!isMandatory(config[84])}\n`;
        }
        
        if (config[85] === 'Yes') {
            yaml += `  - otherDataDetails:\n`;
            yaml += `      additionalDetailType: ${config[86]}\n`;
            yaml += `      type: ${config[87]}\n`;
            yaml += `      optional: ${!isMandatory(config[88])}\n`;
        }
        
        if (config[89] === 'Yes') {
            yaml += `  - otherDataDetails:\n`;
            yaml += `      additionalDetailType: ${config[90]}\n`;
            yaml += `      type: ${config[91]}\n`;
            yaml += `      optional: ${!isMandatory(config[92])}\n`;
        }
        
        if (config[93] === 'Yes') {
            yaml += `  - otherDataDetails:\n`;
            yaml += `      additionalDetailType: ${config[94]}\n`;
            yaml += `      type: ${config[95]}\n`;
            yaml += `      optional: ${!isMandatory(config[96])}\n`;
        }
    }
    
    // Other Category
    if (config[97] === 'Yes' || config[100] === 'Yes' || config[103] === 'Yes' || config[106] === 'Yes') {
        yaml += `# Object 13 - Other Category object\n`;
        yaml += `otherCategoryValues:\n`;
        
        if (config[97] === 'Yes') {
            yaml += `  - otherCategoryValuesDetails:\n`;
            yaml += `      categoryName: ${config[98]}\n`;
            yaml += `      optional: ${!isMandatory(config[99])}\n`;
        }
        
        if (config[100] === 'Yes') {
            yaml += `  - otherCategoryValuesDetails:\n`;
            yaml += `      categoryName: ${config[101]}\n`;
            yaml += `      optional: ${!isMandatory(config[102])}\n`;
        }
        
        if (config[103] === 'Yes') {
            yaml += `  - otherCategoryValuesDetails:\n`;
            yaml += `      categoryName: ${config[104]}\n`;
            yaml += `      optional: ${!isMandatory(config[105])}\n`;
        }
        
        if (config[106] === 'Yes') {
            yaml += `  - otherCategoryValuesDetails:\n`;
            yaml += `      categoryName: ${config[107]}\n`;
            yaml += `      optional: ${!isMandatory(config[108])}\n`;
        }
    }
    
    // Document References
    if (config[109] === 'Yes') {
        yaml += `# Object 14 - Document References\n`;
        yaml += `documentReferences:\n`;
        yaml += `  referenceName: ${config[110]}\n`;
        yaml += `  optional: ${!isMandatory(config[111])}\n`;
        yaml += `  multiples: ${config[112]}\n`;
    }
    
    // Related Document
    if (config[113] === 'Yes') {
        yaml += `# Object 15 - Related Document\n`;
        yaml += `relatedDocument:\n`;
        if (jurisdiction.toUpperCase() === 'NSW') {
            yaml += `  relatedDocumentName: Notice of Sale\n`;
        } else {
            yaml += `  relatedDocumentName: ${config[114]}\n`;
        }
        yaml += `  optional: ${!isMandatory(config[115])}\n`;
        yaml += `  multiples: ${config[116]}\n`;
    }
    
    // Operative Words
    if (config[117] && config[117] !== 'N/A') {
        yaml += `# Operative Words:\n`;
        yaml += `operativeWords: ${config[117]}\n`;
    }
    
    // Supporting Documents
    if (config[118] && config[118] !== 'N/A') {
        yaml += `# Supporting Documents:\n`;
        yaml += `supportingDocuments:\n`;
        yaml += `  type:\n`;
        
        if (jurisdiction.toUpperCase() === 'NSW') {
            if (config[118] === 'Notice of Sale (Type1)') {
                yaml += `    - Notice of Sale 3\n`;
            } else if (config[118] === 'Notice of Sale (Type2)') {
                yaml += `    - Notice of Sale 2\n`;
            } else if (config[118] === 'Notice of Sale (Type3)') {
                yaml += `    - Notice of Sale 1\n`;
            } else {
                yaml += `    - ${config[118]}\n`;
            }
        } else {
            yaml += `    - ${config[118]}\n`;
        }
    }
    
    // Stamp Duty
    if (config[119] && config[119] !== 'No' && config[119] !== 'N') {
        yaml += `# Stamp Duty Needed:\n`;
        if (jurisdiction.toUpperCase() === 'NSW') {
            yaml += `stampDuty: ${booleanConverter(config[119])}\n`;
        } else {
            yaml += `stampDuty: ${isMandatory(config[119])}\n`;
        }
    }
    
    // CoRD Consent
    if (config[120] === 'Yes' && config[120] !== 'N/A' && config[120] !== 'No') {
        yaml += `# CoRD Consent:\n`;
        yaml += `cordConsent:\n`;
        yaml += `  required: ${config[120]}\n`;
    }
    
    // Attachments
    if (config[121] || config[124] || config[127] || config[130] || config[133]) {
        yaml += `# Attachments:\n`;
        yaml += `attachments:\n`;
        
        if (config[121]) {
            yaml += `  - attachmentDetails:\n`;
            yaml += `      attachmentType: ${config[121]}\n`;
            yaml += `      signWithDocument: ${booleanConverter(config[122])}\n`;
            yaml += `      optional: ${!isMandatory(config[123])}\n`;
        }
        
        if (config[124]) {
            yaml += `  - attachmentDetails:\n`;
            yaml += `      attachmentType: ${config[124]}\n`;
            yaml += `      signWithDocument: ${booleanConverter(config[125])}\n`;
            yaml += `      optional: ${!isMandatory(config[126])}\n`;
        }
        
        if (config[127]) {
            yaml += `  - attachmentDetails:\n`;
            yaml += `      attachmentType: ${config[127]}\n`;
            yaml += `      signWithDocument: ${booleanConverter(config[128])}\n`;
            yaml += `      optional: ${!isMandatory(config[129])}\n`;
        }
        
        if (config[130]) {
            yaml += `  - attachmentDetails:\n`;
            yaml += `      attachmentType: ${config[130]}\n`;
            yaml += `      signWithDocument: ${booleanConverter(config[131])}\n`;
            yaml += `      optional: ${!isMandatory(config[132])}\n`;
        }
        
        if (config[133]) {
            yaml += `  - attachmentDetails:\n`;
            yaml += `      attachmentType: ${config[133]}\n`;
            yaml += `      signWithDocument: ${booleanConverter(config[134])}\n`;
            yaml += `      optional: ${!isMandatory(config[135])}\n`;
        }
    }
    
    return { yaml, documentName };
}

function booleanConverter(value) {
    return value === 'Yes' ? 'true' : 'false';
}

function isMandatory(value) {
    return value === 'Mandatory';
}

function renderSigningCertification(certString) {
    const certs = certString.replace(/"/g, '').replace(/ /g, '').replace(/\*/g, '');
    if (!certs) return '';
    
    let yaml = `  signingCertifications:\n`;
    certs.split(',').forEach(cert => {
        yaml += `    - ${cert}\n`;
    });
    return yaml;
}

function toCamelCase(str) {
    return str.trim().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
}

function displayOutput(files) {
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = '<h2 style="margin-bottom: 15px;">Generated Files:</h2>';
    
    files.forEach((file, index) => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';
        
        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn-view';
        viewBtn.textContent = 'View';
        viewBtn.onclick = () => viewFile(index);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = '#';
        downloadLink.className = 'download-link';
        downloadLink.textContent = 'Download';
        downloadLink.onclick = (e) => {
            e.preventDefault();
            downloadFile(file.name, file.content);
        };
        
        buttonGroup.appendChild(viewBtn);
        buttonGroup.appendChild(downloadLink);
        fileDiv.appendChild(fileName);
        fileDiv.appendChild(buttonGroup);
        outputDiv.appendChild(fileDiv);
    });
}

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
}

function downloadAll() {
    const zip = new JSZip();
    generatedFiles.forEach(file => {
        zip.file(file.name, file.content);
    });
    
    zip.generateAsync({ type: 'blob' }).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'yaml-files.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function viewFile(index) {
    const file = generatedFiles[index];
    document.getElementById('modalTitle').textContent = file.name;
    if (editor) {
        editor.setValue(file.content);
    }
    document.getElementById('viewModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('viewModal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('viewModal');
    if (event.target === modal) {
        closeModal();
    }
}

window.onkeydown = function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
}
