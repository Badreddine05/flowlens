import unittest
import xml.etree.ElementTree as ET
from pipeline.build import compact_trace, milliseconds

def trace(items):
    root=ET.Element('trace')
    ET.SubElement(root,'string',key='ApplicationType',value='New credit')
    for state,stamp in items:
        event=ET.SubElement(root,'event')
        ET.SubElement(event,'string',key='concept:name',value=state)
        ET.SubElement(event,'date',key='time:timestamp',value=stamp)
    return root

class PipelineTests(unittest.TestCase):
    def test_timezone_conversion(self):
        self.assertEqual(milliseconds('2016-01-01T01:00:00+01:00'),milliseconds('2016-01-01T00:00:00Z'))
        with self.assertRaises(ValueError): milliseconds('2016-01-01T00:00:00')
    def test_projection_and_order(self):
        row,q=compact_trace(trace([('A_Pending','2016-01-03T00:00:00Z'),('O_Created','2016-01-02T00:00:00Z'),('A_Create Application','2016-01-01T00:00:00Z')]),1)
        self.assertEqual(row['events'],[[0,0.0],[7,172800.0]])
        self.assertEqual(row['status'],'pending');self.assertEqual(row['duration'],2)
        self.assertEqual(q['reorderedTraces'],1);self.assertEqual(q['rawEvents'],3)
    def test_exact_duplicate_removed_but_return_retained(self):
        row,q=compact_trace(trace([('A_Create Application','2016-01-01T00:00:00Z'),('A_Validating','2016-01-02T00:00:00Z'),('A_Validating','2016-01-02T00:00:00Z'),('A_Incomplete','2016-01-03T00:00:00Z'),('A_Validating','2016-01-04T00:00:00Z')]),1)
        self.assertEqual(q['duplicatesRemoved'],1);self.assertEqual(len(row['events']),4);self.assertEqual(row['status'],'open')
    def test_unknown_activity_reported(self):
        _,q=compact_trace(trace([('A_Create Application','2016-01-01T00:00:00Z'),('A_Unknown','2016-01-02T00:00:00Z')]),1)
        self.assertEqual(q['unknownStates'],1)
    def test_no_application_state_is_rejected(self):
        with self.assertRaises(ValueError):compact_trace(trace([('O_Created','2016-01-01T00:00:00Z')]),1)

if __name__=='__main__':unittest.main()
