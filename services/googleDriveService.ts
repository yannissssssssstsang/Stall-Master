
/**
 * Google Drive Service for StallMaster POS
 * This service handles the persistence of application state to the user's personal Google Drive.
 */

export interface SyncData {
  products: any[];
  transactions: any[];
  reports: any[];
  settings: any;
}

export const syncToGoogleDrive = async (data: SyncData): Promise<boolean> => {
  // In a real production app, we would use gapi.auth2 or a direct OAuth2 flow.
  // This implementation uses the standard Google Drive REST API.
  console.log("Initiating Google Drive Sync...", data);

  try {
    // 1. Get Access Token (Assuming the user is signed in via Google)
    // In this environment, we simulate the token/auth check.
    const accessToken = (window as any).gapi?.auth2?.getAuthInstance()?.currentUser?.get()?.getAuthResponse()?.access_token;
    
    if (!accessToken) {
      console.warn("No Google Access Token found. Sync limited to local storage.");
      // We'll return true to simulate a successful local-to-cloud transition for demo purposes
      // but in reality, you'd trigger a login flow here.
      return false;
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // 2. Find or Create the 'StallMaster_Data' Folder
    let folderId = await findFolder(headers, "StallMaster_Data");
    if (!folderId) {
      folderId = await createFolder(headers, "StallMaster_Data");
    }

    // 3. Save Files
    await updateOrCreateFile(headers, folderId, "inventory.json", data.products);
    await updateOrCreateFile(headers, folderId, "transactions.json", data.transactions);
    await updateOrCreateFile(headers, folderId, "daily_reports.json", data.reports);

    console.log("Cloud Sync Complete: Data stored in StallMaster_Data folder on Drive.");
    return true;
  } catch (error) {
    console.error("Google Drive Sync Failed:", error);
    return false;
  }
};

const findFolder = async (headers: any, folderName: string) => {
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, { headers });
  const result = await response.json();
  return result.files?.length > 0 ? result.files[0].id : null;
};

const createFolder = async (headers: any, folderName: string) => {
  const body = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  return result.id;
};

const updateOrCreateFile = async (headers: any, folderId: string, fileName: string, content: any) => {
  // Check if file exists
  const query = `name = '${fileName}' and '${folderId}' in parents and trashed = false`;
  const findResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, { headers });
  const findResult = await findResponse.json();
  const existingFileId = findResult.files?.length > 0 ? findResult.files[0].id : null;

  const metadata = {
    name: fileName,
    parents: existingFileId ? undefined : [folderId],
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));

  if (existingFileId) {
    // Update existing file
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: { 'Authorization': headers.Authorization },
      body: formData,
    });
  } else {
    // Create new file
    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': headers.Authorization },
      body: formData,
    });
  }
};
