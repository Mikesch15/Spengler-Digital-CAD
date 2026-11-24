package ch.spenglerdigital.cad;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DruckPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
