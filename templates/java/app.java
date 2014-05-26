/**
 * simple runner for java command line
 */

public class app
{
	public static void main(String args[])
	{
		int exitCode = 0;
		try {
			System.out.println("---> Loading Java App");
			System.loadLibrary("App");
			System.out.println("---> Executing App");
			org.appcelerator.hyperloop.Hyperloop.loadApp();
			System.out.println("---> Executed App");
		}
		catch (Throwable ex) {
			System.err.println("--> Error: "+ex);
			exitCode = -1;
		}
		finally {
			System.out.println("<--- Exiting Java App");
			System.out.flush();
			System.exit(exitCode);
		}
	}
}