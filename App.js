import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://YOUR_BACKEND_IP:8000';
const BUYER_CATEGORIES = [
  'Importer',
  'Wholesaler',
  'Retailer',
  'Manufacturer/processor',
  'Food-service buyer',
];
const LEAD_COLUMNS = [
  ['Company Name', 'company_name'],
  ['Buyer Category', 'buyer_category'],
  ['Website URL', 'website_url'],
  ['Public Email', 'public_email'],
  ['Phone', 'phone'],
  ['Buyer Fit', 'buyer_fit_reasoning'],
];

function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function createCsv(leads) {
  const rows = [
    LEAD_COLUMNS.map(([label]) => label),
    ...leads.map((lead) => LEAD_COLUMNS.map(([, key]) => lead[key] || '')),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export default function App() {
  const [product, setProduct] = useState('');
  const [countriesText, setCountriesText] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [leads, setLeads] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  async function searchLeads() {
    const targetCountries = countriesText
      .split(',')
      .map((country) => country.trim())
      .filter(Boolean);

    if (!product.trim() || targetCountries.length === 0 || !selectedCategories.length) {
      Alert.alert(
        'Missing details',
        'Enter a product, select at least one buyer category, and add a target country.',
      );
      return;
    }

    setLoading(true);
    setLeads([]);
    setWarnings([]);
    setSearchError('');
    setSearchCompleted(false);
    try {
      const response = await fetch(`${API_BASE_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: product.trim(),
          target_countries: targetCountries,
          buyer_categories: selectedCategories,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `Search failed (${response.status}).`);
      }
      setLeads(Array.isArray(data.leads) ? data.leads : []);
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setSearchCompleted(true);
    } catch (error) {
      const message = error.message || 'Could not connect to the backend.';
      setSearchError(`Search failed: ${message}`);
      setSearchCompleted(false);
      if (Platform.OS !== 'web') {
        Alert.alert('Search failed', message);
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(category) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
    setLeads([]);
    setWarnings([]);
    setSearchError('');
    setSearchCompleted(false);
  }

  async function exportCsv() {
    if (!leads.length) return;
    setExporting(true);
    setExportMessage('');
    try {
      const csv = `\uFEFF${createCsv(leads)}`;
      const fileName = `b2b-leads-${Date.now()}.csv`;

      if (Platform.OS === 'web') {
        const fileUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
        setExportMessage('CSV downloaded.');
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error('File sharing is not available on this device.');
      }
      const fileUri = `${FileSystem.cacheDirectory}b2b-leads-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export B2B leads',
        UTI: 'public.comma-separated-values-text',
      });
      setExportMessage('CSV ready to share.');
    } catch (error) {
      const message = error.message || 'Could not create the CSV file.';
      setExportMessage(`Export failed: ${message}`);
      if (Platform.OS !== 'web') {
        Alert.alert('Export failed', message);
      }
    } finally {
      setExporting(false);
    }
  }

  function renderLead({ item, index }) {
    return (
      <View style={styles.leadCard}>
        <Text style={styles.leadNumber}>LEAD {index + 1}</Text>
        <Text style={styles.companyName}>{item.company_name}</Text>
        <Text style={styles.categoryBadge}>{item.buyer_category}</Text>
        <Text style={styles.label}>Website</Text>
        <Text
          accessibilityRole="link"
          onPress={() =>
            Linking.openURL(item.website_url).catch(() =>
              Alert.alert('Unable to open website', 'Check your internet connection and try again.'),
            )
          }
          style={styles.websiteLink}
        >
          {item.website_url}
        </Text>
        <Text style={styles.label}>Public email</Text>
        <Text style={styles.value}>{item.public_email || 'Not found'}</Text>
        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{item.phone || 'Not found'}</Text>
        <View style={styles.fitHeader}>
          <Text style={styles.label}>Buyer fit</Text>
          <Text style={item.potential_buyer ? styles.fitYes : styles.fitUnclear}>
            {item.potential_buyer ? 'Potential buyer' : 'Not confirmed'}
          </Text>
        </View>
        <Text style={styles.reasoning}>{item.buyer_fit_reasoning}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f7fb" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>B2B SALES RESEARCH</Text>
        <Text style={styles.title}>Find your next buyers</Text>
        <Text style={styles.subtitle}>
          Find potential buyers using live company websites and buyer evidence.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Product Name</Text>
          <TextInput
            value={product}
            onChangeText={setProduct}
            placeholder="e.g. Silk cloth"
            placeholderTextColor="#8b96a8"
            style={styles.input}
            returnKeyType="next"
          />
          {product.trim() ? (
            <View style={styles.categorySection}>
              <Text style={styles.inputLabel}>Buyer Category</Text>
              <Text style={styles.categoryHint}>Choose one or more types of buyer to find.</Text>
              <View style={styles.categoryList}>
                {BUYER_CATEGORIES.map((category) => {
                  const selected = selectedCategories.includes(category);
                  return (
                    <TouchableOpacity
                      key={category}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => toggleCategory(category)}
                      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && styles.categoryChipTextSelected,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
          <Text style={styles.inputLabel}>Target Countries</Text>
          <TextInput
            value={countriesText}
            onChangeText={setCountriesText}
            placeholder="e.g. UAE, South Africa"
            placeholderTextColor="#8b96a8"
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
          />
          <TouchableOpacity
            accessibilityRole="button"
            onPress={searchLeads}
            disabled={loading || !selectedCategories.length}
            style={[
              styles.searchButton,
              (loading || !selectedCategories.length) && styles.buttonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.searchButtonText}>Search Leads</Text>
            )}
          </TouchableOpacity>
        </View>

        {searchError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Search not completed</Text>
            <Text style={styles.errorText}>{searchError}</Text>
          </View>
        ) : null}

        {warnings.length > 0 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Search quality notes</Text>
            {warnings.slice(0, 3).map((warning, index) => (
              <Text key={`${index}-${warning}`} style={styles.warningText}>
                {warning}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.resultsHeader}>
          <View>
            <Text style={styles.resultsTitle}>Your leads</Text>
            <Text style={styles.resultsCount}>
              {leads.length} {leads.length === 1 ? 'company' : 'companies'}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={exportCsv}
            disabled={!leads.length || exporting}
            style={[styles.exportButton, (!leads.length || exporting) && styles.buttonDisabled]}
          >
            {exporting ? (
              <ActivityIndicator color="#176b58" />
            ) : (
              <Text style={styles.exportButtonText}>Export to CSV</Text>
            )}
          </TouchableOpacity>
        </View>
        {exportMessage ? <Text style={styles.exportMessage}>{exportMessage}</Text> : null}

        {leads.length > 0 ? (
          <FlatList
            data={leads}
            keyExtractor={(item, index) => `${item.website_url}-${index}`}
            renderItem={renderLead}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {searchCompleted ? 'No verified leads found' : 'No leads yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchCompleted
                ? 'The search finished, but no live company websites passed buyer verification. Try another country, category, or product description.'
                : 'Enter a product, choose buyer categories, and add target countries to search.'}
            </Text>
          </View>
        )}
        <Text style={styles.disclaimer}>
          Buyer fit is AI-assisted research and should be verified before outreach.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f7fb' },
  container: { padding: 20, paddingBottom: 40 },
  eyebrow: { color: '#176b58', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#15243a', fontSize: 29, fontWeight: '800', marginTop: 8 },
  subtitle: { color: '#64738a', fontSize: 15, marginTop: 7, marginBottom: 20 },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e6ebf2',
  },
  inputLabel: { color: '#25354d', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: {
    borderColor: '#dce3ed',
    borderWidth: 1,
    borderRadius: 10,
    color: '#15243a',
    fontSize: 15,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 16,
  },
  categorySection: { marginBottom: 16 },
  categoryHint: { color: '#758198', fontSize: 12, marginTop: -4, marginBottom: 10 },
  categoryList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    backgroundColor: '#f4f7fb',
    borderColor: '#dce3ed',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipSelected: { backgroundColor: '#e8f4f0', borderColor: '#176b58' },
  categoryChipText: { color: '#52627a', fontSize: 12, fontWeight: '600' },
  categoryChipTextSelected: { color: '#176b58' },
  searchButton: {
    alignItems: 'center',
    backgroundColor: '#176b58',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 2,
  },
  searchButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.55 },
  warningBox: {
    backgroundColor: '#fff8e8',
    borderColor: '#f3ddb0',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    padding: 13,
  },
  warningTitle: { color: '#714e0d', fontSize: 13, fontWeight: '700', marginBottom: 5 },
  warningText: { color: '#765f35', fontSize: 12, marginTop: 3 },
  errorBox: {
    backgroundColor: '#fff0f0',
    borderColor: '#f0caca',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    padding: 13,
  },
  errorTitle: { color: '#8a2929', fontSize: 13, fontWeight: '700', marginBottom: 5 },
  errorText: { color: '#733b3b', fontSize: 12, lineHeight: 18 },
  resultsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 12,
  },
  resultsTitle: { color: '#15243a', fontSize: 20, fontWeight: '800' },
  resultsCount: { color: '#758198', fontSize: 13, marginTop: 3 },
  exportButton: {
    backgroundColor: '#e8f4f0',
    borderRadius: 9,
    justifyContent: 'center',
    minHeight: 39,
    paddingHorizontal: 12,
  },
  exportButtonText: { color: '#176b58', fontSize: 13, fontWeight: '700' },
  exportMessage: { color: '#176b58', fontSize: 12, marginTop: -4, marginBottom: 10 },
  leadCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e6ebf2',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 11,
    padding: 16,
  },
  leadNumber: { color: '#176b58', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  companyName: { color: '#15243a', fontSize: 17, fontWeight: '800', marginTop: 5, marginBottom: 10 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f4f0',
    borderRadius: 12,
    color: '#176b58',
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  label: { color: '#718098', fontSize: 11, fontWeight: '700', marginTop: 8, textTransform: 'uppercase' },
  value: { color: '#263750', fontSize: 13, marginTop: 3 },
  websiteLink: { color: '#176b58', fontSize: 13, marginTop: 3, textDecorationLine: 'underline' },
  fitHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  fitYes: { color: '#176b58', fontSize: 11, fontWeight: '700', marginTop: 8 },
  fitUnclear: { color: '#8b650f', fontSize: 11, fontWeight: '700', marginTop: 8 },
  reasoning: { color: '#4d5c72', fontSize: 13, lineHeight: 19, marginTop: 5 },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e6ebf2',
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: { color: '#25354d', fontSize: 15, fontWeight: '700' },
  emptyText: { color: '#758198', fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  disclaimer: { color: '#8b96a8', fontSize: 11, lineHeight: 16, marginTop: 12, textAlign: 'center' },
});
