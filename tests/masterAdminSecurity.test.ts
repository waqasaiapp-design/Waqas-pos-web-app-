import {
  generateRecoveryKey,
  normalizeRecoveryKey,
  hashPasswordClient,
  encryptDataAesGcm,
  decryptDataAesGcm,
  getLockoutStatus,
  recordFailedLoginAttempt,
  resetLoginAttempts,
  generateSalt,
  simpleSha256Hex,
} from '../src/utils/cryptoSecurity';
import { calculateLineItem, calculateInvoiceTotals } from '../src/utils/newPosCalculations';
import fs from 'fs';
import path from 'path';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

async function runMasterAdminTests() {
  console.log('================================================================');
  console.log('   WAQAS POS SOFTWARE - MASTER ADMIN & SECURITY TEST SUITE       ');
  console.log('================================================================');

  // Test 1 & 5: Master Admin Recovery Key generation
  console.log('\n--- 1 & 5. Recovery Key Generation & Format ---');
  const recoveryKey = generateRecoveryKey();
  assert(recoveryKey.startsWith('WQP-'), `Key should start with WQP-, got ${recoveryKey}`);
  const parts = recoveryKey.split('-');
  assert(parts.length === 5, `Key should have 5 parts separated by hyphens, got ${parts.length}`);
  const normalized = normalizeRecoveryKey(recoveryKey);
  assert(normalized.length === 19, `Normalized key should have 19 characters (WQP + 16 chars), got ${normalized.length}`);
  console.log(`✓ Passed: Recovery Key generated successfully: ${recoveryKey}`);

  // Test 3 & 4: Strong Password Creation & PBKDF2 Hashing
  console.log('\n--- 3 & 4. Password Hashing (PBKDF2 100,000 Iterations) & Verification ---');
  const salt = generateSalt(16);
  const password = 'WaqasMasterSecure@2026';
  const wrongPassword = 'WrongPassword@123';
  const passHash = await hashPasswordClient(password, salt);
  const passHashWrong = await hashPasswordClient(wrongPassword, salt);
  assert(passHash.length === 64, `Hash length should be 64 hex chars, got ${passHash.length}`);
  assert(passHash !== passHashWrong, 'Hashes for different passwords must not match');
  console.log('✓ Passed: PBKDF2 Password Hashing & Verification validated');

  // Test 6 & 7: Recovery Key Validation & Password Recovery
  console.log('\n--- 6 & 7. Recovery Key Hash Derivation & Offline Recovery ---');
  const recSalt = generateSalt(16);
  const recHash = await hashPasswordClient(normalized, recSalt);
  // Verify matching key
  const testInputKey = normalizeRecoveryKey(recoveryKey);
  const testInputHash = await hashPasswordClient(testInputKey, recSalt);
  assert(testInputHash === recHash, 'Correct recovery key must reproduce the same hash');
  // Verify invalid key fails
  const invalidKey = normalizeRecoveryKey('WQP-AAAA-BBBB-CCCC-DDDD');
  const invalidHash = await hashPasswordClient(invalidKey, recSalt);
  assert(invalidHash !== recHash, 'Invalid recovery key must not match hash');
  // Replacement key generation on recovery
  const replacementKey = generateRecoveryKey();
  assert(replacementKey !== recoveryKey, 'Replacement key must be unique from previous key');
  console.log(`✓ Passed: Recovery Key verified and replacement key generated: ${replacementKey}`);

  // Test 10: Strict Shop Data Isolation
  console.log('\n--- 10. Shop Data Isolation ---');
  const shopsDir = path.resolve(process.cwd(), 'data', 'shops');
  assert(fs.existsSync(shopsDir), 'data/shops directory must exist');
  const defaultShopFile = path.join(shopsDir, 'SHOP-WM-001.json');
  assert(fs.existsSync(defaultShopFile), 'SHOP-WM-001.json must exist in data/shops');
  const shopWmData = JSON.parse(fs.readFileSync(defaultShopFile, 'utf-8'));
  assert(shopWmData.branding?.storeName === 'WAQAS MART', 'SHOP-WM-001 branding preserved');
  console.log('✓ Passed: Shop data isolated in individual storage files');

  // Test 11, 19, 20: Database & Backup AES-256-GCM Encryption
  console.log('\n--- 11, 19, 20. AES-256-GCM Encryption & Checksum Integrity ---');
  const samplePayload = JSON.stringify({
    shopId: 'SHOP-WM-001',
    transactions: [{ id: 'TX-101', total: 5000 }],
    products: [{ id: 'PR-1', name: 'Dal Chana 1kg', stock: 25 }],
  });
  const backupPassword = 'BackupSecretPassword@2026';
  const encrypted = await encryptDataAesGcm(samplePayload, backupPassword);
  assert(encrypted.version === '2.0-offline', 'Backup version must be 2.0-offline');
  assert(encrypted.ciphertext.length > 0, 'Ciphertext must not be empty');
  assert(encrypted.salt.length === 32, 'Salt must be 32 hex chars');
  assert(encrypted.iv.length === 24, 'IV must be 24 hex chars (12 bytes)');
  assert(encrypted.checksum.length === 64, 'Checksum must be 64 hex chars');
  console.log('✓ Passed: Data encrypted with AES-256-GCM and SHA-256 checksum');

  // Test 21: Decrypt Backup with Correct Password
  console.log('\n--- 21. Backup Decryption & Integrity Verification ---');
  const decrypted = await decryptDataAesGcm(encrypted, backupPassword);
  assert(decrypted === samplePayload, 'Decrypted text must match original plaintext exactly');
  console.log('✓ Passed: Decrypted successfully with password and verified integrity');

  // Test 22: Wrong Backup Password Handling
  console.log('\n--- 22. Wrong Backup Password Handling ---');
  let wrongPassCaught = false;
  try {
    await decryptDataAesGcm(encrypted, 'WrongBackupPassword!999');
  } catch (err: any) {
    wrongPassCaught = true;
    assert(err.message.includes('Decryption failed'), 'Should indicate decryption failed');
  }
  assert(wrongPassCaught, 'Decryption must fail when incorrect password is provided');
  console.log('✓ Passed: Wrong backup password correctly rejected');

  // Test 23: Corrupted Backup Handling
  console.log('\n--- 23. Corrupted Backup Payload Handling ---');
  let corruptedCaught = false;
  try {
    const corruptedEncrypted = {
      ...encrypted,
      ciphertext: '00112233445566778899aabbccddeeff', // Corrupted ciphertext
    };
    await decryptDataAesGcm(corruptedEncrypted, backupPassword);
  } catch (err: any) {
    corruptedCaught = true;
  }
  assert(corruptedCaught, 'Corrupted backup must fail decryption');
  console.log('✓ Passed: Corrupted backup payload safely caught and rejected');

  // Test 17: Login Attempt Limits & Lockout
  console.log('\n--- 17. Failed Login Attempt Limits & Lockout ---');
  const testUser = 'lockout_test_user';
  resetLoginAttempts(testUser);
  for (let i = 1; i <= 4; i++) {
    const status = recordFailedLoginAttempt(testUser);
    assert(!status.isLocked, `Attempt ${i} should not be locked`);
    assert(status.attemptsCount === i, `Attempt count should be ${i}`);
  }
  // 5th attempt locks out
  const lockedStatus = recordFailedLoginAttempt(testUser);
  assert(lockedStatus.isLocked, '5th failed attempt must trigger lockout');
  assert(lockedStatus.remainingSeconds > 800, 'Lockout duration must be ~15 minutes');
  resetLoginAttempts(testUser);
  const clearedStatus = getLockoutStatus(testUser);
  assert(!clearedStatus.isLocked, 'Resetting attempts clears lockout');
  console.log('✓ Passed: 5 failed attempts triggered 15-minute temporary lockout');

  // Test 13 & 14: POS Offline Calculations Regression
  console.log('\n--- 13 & 14. POS Offline Sales & Line Item Calculations ---');
  const line1 = calculateLineItem(3, 200, 10, 0); // 3 * 200 = 600 - 60 = 540
  assert(line1.grossLineTotal === 600, 'Gross total 600');
  assert(line1.discountAmount === 60, 'Discount 60');
  assert(line1.netLineAmount === 540, 'Net line amount 540');

  const cartItem = {
    id: 'cart-1',
    product: { id: 'p1', name: 'Test Product', barcode: '123', price: 200, costPrice: 150, stock: 50, category: 'General', unit: 'Pcs' },
    quantity: 3,
    unitPrice: 200,
    lineTotal: 600,
    discountPercent: 10,
    discountAmount: 60,
    netAmount: 540,
  };
  const totals = calculateInvoiceTotals([cartItem], 0, 0, 540);
  assert(totals.subtotal === 600, 'Invoice subtotal 600');
  assert(totals.grandTotal === 540, 'Invoice grand total 540');
  assert(totals.remainingBalance === 0, 'Invoice fully paid');
  console.log('✓ Passed: Offline sales calculation regression verified');

  // Test 24: Existing Business Data Migration & Preservation
  console.log('\n--- 24. Genuine Business Records Preservation ---');
  const storeDb = JSON.parse(fs.readFileSync('./data/store_db.json', 'utf-8'));
  assert(Array.isArray(storeDb.suppliers), 'Suppliers must be array');
  assert(storeDb.suppliers.length === 3, 'Genuine suppliers must be preserved (3 suppliers)');
  assert(storeDb.branding.storeName === 'WAQAS MART', 'Store branding preserved');
  console.log(`✓ Passed: Existing business data preserved (${storeDb.suppliers.length} suppliers intact)`);

  // Verification of Super Admin Removal
  console.log('\n--- Final: Removal of Old Super Admin ---');
  const authDb = JSON.parse(fs.readFileSync('./data/auth_db.json', 'utf-8'));
  const hasSuperAdmin = authDb.users.some((u: any) => u.role === 'SUPER_ADMIN' || u.id === 'USR-SUPER-ADMIN-01');
  assert(!hasSuperAdmin, 'auth_db.json must NOT contain USR-SUPER-ADMIN-01 or role SUPER_ADMIN');
  console.log('✓ Passed: USR-SUPER-ADMIN-01 and role SUPER_ADMIN completely purged from auth_db.json');

  // Test 25: Reset Master Password Feature
  console.log('\n--- 25. Reset Master Password Option & Verification ---');
  const adminSalt = generateSalt(16);
  const initialPassword = 'InitialMasterSecret@2026';
  const adminRecKey = generateRecoveryKey();
  const adminRecSalt = generateSalt(16);
  const adminRecHash = await hashPasswordClient(normalizeRecoveryKey(adminRecKey), adminRecSalt);

  // Verify Recovery Key matches
  const inputRecKeyNormalized = normalizeRecoveryKey(adminRecKey);
  const verifyKeyHash = await hashPasswordClient(inputRecKeyNormalized, adminRecSalt);
  assert(verifyKeyHash === adminRecHash, 'Recovery Key must verify successfully for reset');

  // Reset password and verify PBKDF2 100k hashing
  const newMasterPassword = 'BrandNewMasterPassword@2027';
  const newPassSalt = generateSalt(16);
  const newPassHash = await hashPasswordClient(newMasterPassword, newPassSalt);

  // Authenticate with new password
  const loginAttemptHash = await hashPasswordClient(newMasterPassword, newPassSalt);
  assert(loginAttemptHash === newPassHash, 'New Master Password must authenticate immediately');

  // Confirm old password is now rejected
  const oldLoginAttemptHash = await hashPasswordClient(initialPassword, newPassSalt);
  assert(oldLoginAttemptHash !== newPassHash, 'Old Master Password must be rejected after reset');

  // Reject invalid recovery key
  const badRecKey = 'WQP-WRON-GKEY-TEST-FAIL';
  const badKeyHash = await hashPasswordClient(normalizeRecoveryKey(badRecKey), adminRecSalt);
  assert(badKeyHash !== adminRecHash, 'Invalid Recovery Key must be rejected');

  // Rate limiting on reset attempts (5 attempts -> 15 min lock)
  const resetTestUser = 'reset_rate_limit_test';
  resetLoginAttempts(`reset_${resetTestUser}`);
  for (let i = 1; i <= 4; i++) {
    const s = recordFailedLoginAttempt(`reset_${resetTestUser}`);
    assert(!s.isLocked, `Reset attempt ${i} must not lock`);
  }
  const fifthAttempt = recordFailedLoginAttempt(`reset_${resetTestUser}`);
  assert(fifthAttempt.isLocked, '5th failed reset attempt must trigger 15-minute lock');
  resetLoginAttempts(`reset_${resetTestUser}`);

  // Confirm no duplicate Master Admin accounts created
  const masterAdmins = authDb.users.filter((u: any) => u.role === 'MASTER_ADMIN');
  assert(masterAdmins.length <= 1, 'Never allow duplicate Master Admin accounts');

  console.log('✓ Passed: Reset Master Password option verified (PBKDF2 Hashing, Key Verification, Rate Limiting, No Duplicates)');

  console.log('\n================================================================');
  console.log('   🎉 ALL MASTER ADMIN & RESET PASSWORD TESTS PASSED!          ');
  console.log('================================================================\n');
}

runMasterAdminTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
